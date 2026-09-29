const test = require('node:test');
const assert = require('node:assert/strict');
const { after, before } = require('node:test');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');

const { connectDB } = require('../src/config/db');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');
const Match = require('../src/models/Match');
const User = require('../src/models/User');
const { registerUser } = require('../src/services/auth.service');
const {
  createEquipo,
  addJugador,
  createPartido,
  actualizarResultadoPartido,
  listarPartidos
} = require('../src/services/gestion.service');

const testEmails = [];
const teamNames = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    const teams = await Team.find({ nombre: { $in: teamNames } }, '_id').lean();
    const teamIds = teams.map((team) => team._id);
    await Match.deleteMany({ $or: [{ equipoLocalId: { $in: teamIds } }, { equipoVisitanteId: { $in: teamIds } }] });
    await Player.deleteMany({ equipo_id: { $in: teamIds } });
    await Team.deleteMany({ _id: { $in: teamIds } });
    await User.deleteMany({ email: { $in: testEmails } });
    await mongoose.disconnect();
  }
});

test('un estudiante registra equipo y jugadores y se guarda el resultado del partido', async () => {
  const runId = randomUUID();
  const email = `estudiante-${runId}@ejemplo.com`;
  const localName = `Halcones ${runId}`;
  const awayName = `Tigres ${runId}`;
  testEmails.push(email);
  teamNames.push(localName, awayName);

  await registerUser({
    name: 'Estudiante Uno',
    email,
    password: 'PruebaSegura1!',
    role: 'student',
    teamName: localName
  });

  const equipoLocal = await createEquipo({ nombre: localName, categoria: 'Bachillerato', emailCapitan: email });
  const equipoVisitante = await createEquipo({ nombre: awayName, categoria: 'Bachillerato' });

  const jugador = await addJugador({
    equipo_id: equipoLocal.id,
    nombre: 'Carlos Torres',
    numero_camiseta: 9,
    posicion: 'Delantero'
  });

  assert.equal(jugador.nombre, 'Carlos Torres');
  assert.equal(jugador.numero_camiseta, 9);
  assert.equal(jugador.goles, 0);

  const partido = await createPartido({
    equipoLocalId: equipoLocal.id,
    equipoVisitanteId: equipoVisitante.id,
    fechaPartido: '2026-09-10',
    horaPartido: '18:00',
    cancha: 'Cancha principal',
    estado: 'Por jugar'
  });

  await actualizarResultadoPartido({
    partidoId: partido.id,
    golesLocal: 2,
    golesVisitante: 1
  });

  const partidos = await listarPartidos();
  const partidoGuardado = partidos.find((item) => item.id === partido.id);

  assert.ok(partidoGuardado);
  assert.equal(partidoGuardado.goles_local, 2);
  assert.equal(partidoGuardado.goles_visitante, 1);
  assert.equal(partidoGuardado.estado, 'Finalizado');
  assert.equal(partidoGuardado.resultado, `${localName} 2 - 1 ${awayName}`);
});
