const test = require('node:test');
const assert = require('node:assert/strict');

const Team = require('../src/models/Team');
const Match = require('../src/models/Match');
const EnrollmentRequest = require('../src/models/EnrollmentRequest');
const EnrollmentSetting = require('../src/models/EnrollmentSetting');
const TournamentConfig = require('../src/models/TournamentConfig');
const { buildStandings } = require('../src/services/tournament.service');
const { createEquipo, addJugador, createPartido, actualizarResultadoPartido } = require('../src/services/gestion.service');
const { updatePopup, updateTeam, updateTeamStats, updatePlayerData, updateMatch } = require('../src/services/admin.service');
const { setEnrollmentAvailability } = require('../src/services/enrollment.service');
const {
  validateEnrollmentPayload,
  assertEnrollmentOpen,
  mapEnrollmentToTeamAndPlayers
} = require('../src/services/enrollment.service');
const { buildSportLinks } = require('../src/controllers/home.controller');
const { sportQuery } = require('../src/constants/sports');
const TEAM_CATEGORIES = require('../src/constants/team-categories');

test('sport tabs keep category and calendar tab query parameters', () => {
  const links = buildSportLinks('/calendario', { deporte: 'baloncesto', tab: 'jugados', categoria: 'Categoría A' });
  assert.equal(links.selectedSport, 'baloncesto');
  assert.deepEqual(links.sports.map(({ href }) => href), [
    '/calendario?deporte=futbol&categoria=Categor%C3%ADa+A&tab=jugados',
    '/calendario?deporte=baloncesto&categoria=Categor%C3%ADa+A&tab=jugados',
    '/calendario?deporte=voleibol&categoria=Categor%C3%ADa+A&tab=jugados'
  ]);
});

test('sport links discard unsupported legacy categories from public filters', () => {
  const links = buildSportLinks('/equipos', { deporte: 'voleibol', categoria: 'Docentes' });
  assert.equal(links.selectedSport, 'voleibol');
  assert.ok(links.sports.every(({ href }) => !href.includes('categoria=')));
});

test('sport query keeps records without a sport in the legacy football view', () => {
  const query = sportQuery('futbol');
  assert.ok(query.$or.some((condition) => condition.deporte?.$exists === false));
  assert.deepEqual(sportQuery('voleibol'), { deporte: 'voleibol' });
});

test('team and match models default to football', () => {
  const team = new Team({ nombre: 'Equipo prueba', categoria: 'Categoría A' });
  const match = new Match({
    equipo_a: 'Equipo A',
    equipo_b: 'Equipo B',
    fecha: '2026-10-14',
    hora: '10:00'
  });
  assert.equal(team.deporte, 'futbol');
  assert.equal(match.deporte, 'futbol');
  assert.equal(new EnrollmentSetting({ deporte: 'futbol' }).abierto, false);
});

test('only student categories are available for teams and enrollment, with legacy team categories retained for existing records', () => {
  assert.deepEqual(TEAM_CATEGORIES, ['Categoría A', 'Categoría B']);
  const team = new Team({ nombre: 'Docentes', categoria: 'Docentes', deporte: 'voleibol' });
  assert.equal(team.validateSync(), undefined);
  const legacyRequest = new EnrollmentRequest({
    deporte: 'baloncesto',
    nombreEquipo: 'Equipo histórico',
    categoria: 'Docentes',
    grado: 'Docentes',
    responsable: 'Persona Responsable',
    contacto: 'responsable@example.edu',
    jugadores: [{ nombre: 'Ana Pérez', numero_camiseta: 8 }]
  });
  assert.equal(legacyRequest.validateSync(), undefined);

  assert.throws(() => validateEnrollmentPayload({
    deporte: 'baloncesto',
    nombreEquipo: 'Profesores',
    categoria: 'Docentes',
    grado: 'Docentes',
    responsable: 'Persona Responsable',
    contacto: 'responsable@example.edu',
    jugadorNombre: ['Ana Pérez'],
    jugadorNumero: ['8']
  }), /categoría válida/i);
});

test('global tournament config starts closed and enables all three sports', () => {
  const config = new TournamentConfig();
  assert.equal(config.inscripcionesAbiertas, false);
  assert.equal(config.get('deportesHabilitados.futbol'), true);
  assert.equal(config.get('deportesHabilitados.baloncesto'), true);
  assert.equal(config.get('deportesHabilitados.voleibol'), true);
});

test('management services reject absent payloads without destructuring errors', async () => {
  await assert.rejects(createEquipo(undefined), /datos del equipo/i);
  await assert.rejects(addJugador(undefined), /datos del jugador/i);
  await assert.rejects(createPartido(undefined), /datos del partido/i);
  await assert.rejects(actualizarResultadoPartido(undefined), /datos del resultado/i);
  await assert.rejects(updatePopup(undefined), /datos del aviso/i);
  await assert.rejects(updateTeam('id', undefined), /datos del equipo/i);
  await assert.rejects(updateTeamStats(undefined), /estadísticas del equipo/i);
  await assert.rejects(updatePlayerData('id', undefined), /datos del jugador/i);
  await assert.rejects(updateMatch(undefined), /datos del partido/i);
  await assert.rejects(setEnrollmentAvailability('true'), /estado de las inscripciones/i);
});

test('standings count only same-sport matches and teams', () => {
  const teams = [
    { id: 'f1', nombre: 'Fútbol Uno', deporte: 'futbol' },
    { id: 'f2', nombre: 'Fútbol Dos', deporte: 'futbol' },
    { id: 'b1', nombre: 'Canastas Uno', deporte: 'baloncesto' },
    { id: 'b2', nombre: 'Canastas Dos', deporte: 'baloncesto' }
  ];
  const matches = [
    { equipoLocalId: 'b1', equipoVisitanteId: 'b2', deporte: 'baloncesto', goles_a: 4, goles_b: 1, estado: 'Finalizado' },
    { equipoLocalId: 'f1', equipoVisitanteId: 'f2', deporte: 'futbol', goles_a: 7, goles_b: 0, estado: 'Finalizado' },
    { equipoLocalId: 'b1', equipoVisitanteId: 'f2', deporte: 'baloncesto', goles_a: 9, goles_b: 0, estado: 'Finalizado' }
  ];
  const standings = buildStandings(teams, matches, 'baloncesto');
  assert.deepEqual(standings.map(({ id }) => id), ['b1', 'b2']);
  assert.equal(standings[0].played, 1);
  assert.equal(standings[0].goalsFor, 4);
  assert.equal(standings[1].played, 1);
});

test('closed enrollment is rejected and submitted roster fields are validated', () => {
  assert.throws(() => assertEnrollmentOpen('futbol', null), /inscripciones.*cerradas/i);
  assert.throws(() => assertEnrollmentOpen('futbol', { deporte: 'futbol', abierto: false }), /cerradas/i);
  assert.doesNotThrow(() => assertEnrollmentOpen('futbol', { deporte: 'futbol', abierto: true }));
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: 'no-es-contacto',
    jugadorNombre: ['Ana Pérez'],
    jugadorNumero: ['8']
  }), /correo válido o un teléfono/i);

  const fivePlayers = {
    jugadorNombre: ['Ana Pérez', 'Luis Pérez', 'María Gómez', 'José Díaz', 'Lucía Ruiz'],
    jugadorNumero: ['8', '9', '10', '11', '12']
  };
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    jugadorNombre: ['Ana Pérez', 'Luis Pérez', 'María Gómez', 'José Díaz'],
    jugadorNumero: ['8', '9', '10', '11']
  }), /entre 5 y 30/i);
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    ...fivePlayers,
    jugadorNombre: ['Ana Pérez', 'Luis Pérez', 'María Gómez', 'José Díaz', 'Jugador 5']
  }), /solo puede contener letras y espacios/i);
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    ...fivePlayers,
    jugadorNombre: ['Ana-Pérez', ...fivePlayers.jugadorNombre.slice(1)]
  }), /solo puede contener letras y espacios/i);
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Responsable 1',
    contacto: '3001234567',
    ...fivePlayers
  }), /solo puede contener letras y espacios/i);

  const duplicateNumbers = validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    aceptoPoliticaDatos: true,
    ...fivePlayers,
    jugadorNumero: ['8', '8', '10', '11', '12']
  });
  assert.deepEqual(duplicateNumbers.jugadores.map(({ numero_camiseta }) => numero_camiseta), ['8', '8', '10', '11', '12']);
  assert.deepEqual(validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    aceptoPoliticaDatos: true,
    jugadorNombre: ['Cero Doble', 'Dorsal Alto', 'Jugador Tres', 'Jugador Cuatro', 'Jugador Cinco'],
    jugadorNumero: ['00', '999', '0', '1', '2']
  }).jugadores.map(({ numero_camiseta }) => numero_camiseta), ['00', '999', '0', '1', '2']);
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    jugadorNombre: ['Fuera de rango', 'Jugador Dos', 'Jugador Tres', 'Jugador Cuatro', 'Jugador Cinco'],
    jugadorNumero: ['1000', '2', '3', '4', '5']
  }), /entre 0 y 999/i);
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    jugadorNombre: Array.from({ length: 31 }, (_, index) => `Jugador ${index + 1}`),
    jugadorNumero: Array.from({ length: 31 }, (_, index) => String(index + 1))
  }), /entre 5 y 30/i);
});

test('validated public enrollment maps sport, grade and shirt numbers to the approved roster', () => {
  const request = validateEnrollmentPayload({
    deporte: 'voleibol',
    nombreEquipo: 'Las Halconas',
    categoria: 'Categoría B',
    grado: '9.º 1',
    responsable: 'María Pérez',
    contacto: 'maria@example.edu',
    aceptoPoliticaDatos: true,
    jugadorNombre: ['Ana Pérez', 'Lucía Gómez', 'María Ruiz', 'José Díaz', 'Eva León'],
    jugadorNumero: ['7', '12', '13', '14', '15']
  });
  const mapped = mapEnrollmentToTeamAndPlayers(request, 'team-id');
  assert.equal(mapped.team.deporte, 'voleibol');
  assert.equal(mapped.team.capitanEmail, null);
  assert.deepEqual(mapped.players.map(({ equipo_id, grado, numero_camiseta }) => [equipo_id, grado, numero_camiseta]), [
    ['team-id', '9.º 1', '7'],
    ['team-id', '9.º 1', '12'],
    ['team-id', '9.º 1', '13'],
    ['team-id', '9.º 1', '14'],
    ['team-id', '9.º 1', '15']
  ]);
});

test('public enrollment requires explicit privacy-policy acceptance', () => {
  assert.throws(() => validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    jugadorNombre: ['Ana Pérez', 'Luis Pérez', 'María Gómez', 'José Díaz', 'Lucía Ruiz'],
    jugadorNumero: ['8', '9', '10', '11', '12']
  }), /aceptar la política de tratamiento de datos/i);

  const request = validateEnrollmentPayload({
    deporte: 'futbol',
    nombreEquipo: 'Equipo',
    categoria: 'Categoría A',
    grado: '8.º 2',
    responsable: 'Persona Responsable',
    contacto: '3001234567',
    aceptoPoliticaDatos: 'true',
    jugadorNombre: ['Ana Pérez', 'Luis Pérez', 'María Gómez', 'José Díaz', 'Lucía Ruiz'],
    jugadorNumero: ['8', '9', '10', '11', '12']
  });
  assert.equal(request.aceptoPoliticaDatos, true);
});
