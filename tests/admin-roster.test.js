const test = require('node:test');
const assert = require('node:assert/strict');
const { after, before } = require('node:test');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');

const { connectDB } = require('../src/config/db');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');
const {
  getPrimaryTeamGrade,
  validatePlayerStatsBatch,
  updatePlayerStatsBatch
} = require('../src/services/admin.service');

const testTeamNames = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    const teams = await Team.find({ nombre: { $in: testTeamNames } }, '_id').lean();
    await Player.deleteMany({ equipo_id: { $in: teams.map((team) => team._id) } });
    await Team.deleteMany({ _id: { $in: teams.map((team) => team._id) } });
    await mongoose.disconnect();
  }
});

test('primary team grade uses the most common roster grade and formats it next to the team name', () => {
  assert.equal(getPrimaryTeamGrade([
    { grado: '7.º 2' },
    { grado: '7.º 2' },
    { grado: '8.º 1' }
  ]), '7°2');
  assert.equal(getPrimaryTeamGrade([{ grado: 'Docentes' }]), 'Docentes');
  assert.equal(getPrimaryTeamGrade([]), '');
});

test('batch player stats validation rejects invalid, duplicate, and oversized changes', () => {
  const validId = new mongoose.Types.ObjectId().toString();
  assert.deepEqual(validatePlayerStatsBatch([
    { id: validId, numero_camiseta: '12', goles: '3' }
  ]), [{ id: validId, numero_camiseta: 12, goles: 3 }]);
  assert.throws(() => validatePlayerStatsBatch([{ id: validId, numero_camiseta: 100, goles: 0 }]), /entre 0 y 99/);
  assert.throws(() => validatePlayerStatsBatch([{ id: validId, numero_camiseta: 1, goles: -1 }]), /entero no negativo/);
  assert.throws(() => validatePlayerStatsBatch([{ id: validId, numero_camiseta: true, goles: 0 }]), /Completa el número/);
  assert.throws(() => validatePlayerStatsBatch([
    { id: validId, numero_camiseta: 1, goles: 0 },
    { id: validId, numero_camiseta: 2, goles: 0 }
  ]), /No repitas jugadores/);
  assert.throws(() => validatePlayerStatsBatch(Array(101).fill({ id: validId, numero_camiseta: 1, goles: 0 })), /entre 1 y 100/);
});

test('batch player stats persist shirt number and goals and reject duplicate shirt numbers without partial edits', async () => {
  const runId = randomUUID();
  const teamName = `Roster batch ${runId}`;
  testTeamNames.push(teamName);
  const team = await Team.create({ nombre: teamName, categoria: 'Categoría A', deporte: 'futbol' });
  const [first, second, third] = await Player.create([
    { equipo_id: team._id, nombre: 'Jugadora Uno', grado: '7.º 2', numero_camiseta: 1, goles: 0 },
    { equipo_id: team._id, nombre: 'Jugador Dos', grado: '7.º 2', numero_camiseta: 2, goles: 1 },
    { equipo_id: team._id, nombre: 'Jugador Tres', grado: '7.º 2', numero_camiseta: 3, goles: 2 }
  ]);

  const result = await updatePlayerStatsBatch([
    { id: first._id.toString(), numero_camiseta: 10, goles: 4 },
    { id: second._id.toString(), numero_camiseta: 11, goles: 5 }
  ]);
  assert.equal(result.updated, 2);
  const saved = await Player.find({ _id: { $in: [first._id, second._id] } }).sort({ numero_camiseta: 1 }).lean();
  assert.deepEqual(saved.map(({ numero_camiseta, goles }) => [numero_camiseta, goles]), [[10, 4], [11, 5]]);

  await assert.rejects(updatePlayerStatsBatch([
    { id: first._id.toString(), numero_camiseta: 20, goles: 8 },
    { id: second._id.toString(), numero_camiseta: 20, goles: 9 }
  ]), /No se puede repetir/);
  await assert.rejects(updatePlayerStatsBatch([
    { id: first._id.toString(), numero_camiseta: 3, goles: 8 }
  ]), /ya está asignado/);

  const unchanged = await Player.findById(first._id).lean();
  assert.deepEqual([unchanged.numero_camiseta, unchanged.goles], [10, 4]);
  assert.ok(third);
});
