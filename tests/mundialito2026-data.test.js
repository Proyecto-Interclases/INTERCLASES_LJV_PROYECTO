const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const teams = require('../src/seeds/mundialito2026.data');
const TEAM_CATEGORIES = require('../src/constants/team-categories');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');
const { createEquipo } = require('../src/services/gestion.service');

test('el seed Mundialito 2026 contiene equipos, categorías, grados y logos transparentes de selecciones', () => {
  assert.equal(teams.length, 15);
  assert.deepEqual(
    teams.reduce((counts, team) => {
      counts[team.categoria] = (counts[team.categoria] || 0) + 1;
      return counts;
    }, {}),
    { 'Categoría A': 9, 'Categoría B': 6 }
  );
  assert.deepEqual(TEAM_CATEGORIES, ['Categoría A', 'Categoría B']);

  for (const team of teams) {
    assert.ok(team.grado);
    assert.ok(team.jugadores.length);
    assert.ok(team.escudoUrl.startsWith('/images/selecciones/'));
    assert.ok(team.escudoUrl.endsWith('.png'));
    const logo = fs.readFileSync(path.join(__dirname, '..', 'src', 'public', team.escudoUrl.slice(1)));
    assert.equal(
      logo.readUInt8(25),
      6,
      `el logo de ${team.nombre} debe ser PNG RGBA con transparencia`
    );
    assert.equal(Object.hasOwn(team, 'posicion'), false);
  }

  assert.equal(teams.reduce((count, team) => count + team.jugadores.length, 0), 108);
  assert.equal(teams.find((team) => team.nombre === 'Alemania').grado, '9.º 1, 10.º 1 y 11.º 1');
  assert.equal(teams.some((team) => team.grado === 'Docentes'), false);
});

test('el modelo y los servicios restringen categorías y guardan grado sin posición forzada', async () => {
  const team = new Team({ nombre: 'Equipo de prueba', categoria: 'Categoría A' });
  assert.equal(await team.validate(), undefined);
  assert.equal(
    new Team({ nombre: 'Categoría anterior', categoria: 'Bachillerato' }).validateSync().errors.categoria.kind,
    'enum'
  );
  assert.equal(
    new Player({ equipo_id: '507f1f77bcf86cd799439011', nombre: 'Ana Prueba' }).validateSync().errors.grado.kind,
    'required'
  );
  assert.equal(
    new Player({ equipo_id: '507f1f77bcf86cd799439011', nombre: 'Ana Prueba', grado: '6.º 1' }).posicion,
    ''
  );
  await assert.rejects(
    createEquipo({ nombre: 'Equipo no válido', categoria: 'Bachillerato' }),
    /La categoría debe ser una de estas opciones/
  );
});
