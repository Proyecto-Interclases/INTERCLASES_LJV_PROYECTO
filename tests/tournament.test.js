const test = require('node:test');
const assert = require('node:assert/strict');

const { buildStandings, formatTeamGrades, attachMatchTeamDetails } = require('../src/services/tournament.service');
const { getTeamCrestUrl } = require('../src/services/team-crest.service');

test('legacy national flags resolve to local transparent federation logos or no image', () => {
  assert.equal(getTeamCrestUrl('/images/banderas/estados-unidos.svg'), '/images/selecciones/estados-unidos.png');
  assert.equal(getTeamCrestUrl('/images/banderas/colombia.svg'), '/images/selecciones/colombia.png');
  assert.equal(getTeamCrestUrl('/images/banderas/costa-de-marfil.svg'), '/images/selecciones/costa-de-marfil.png');
  assert.equal(getTeamCrestUrl('/images/banderas/sin-logo.svg'), '');
});

test('formatTeamGrades muestra grados de sección legibles junto al nombre del equipo', () => {
  assert.equal(formatTeamGrades(['11.º 2', '11.º 2']), '11-2');
  assert.equal(formatTeamGrades(['9.º 1, 10.º 1 y 11.º 1']), '9-1, 10-1 y 11-1');
  assert.equal(formatTeamGrades(['11.º 1']), '11-1');
  assert.equal(formatTeamGrades([]), '');
});

test('match team details resolve crests and grade information by team id or legacy name', () => {
  const teams = [
    { id: 'team-a', nombre: 'Águilas', escudoUrl: '/images/selecciones/colombia.png', grado: '10-1' },
    { id: 'team-b', nombre: 'Leones', escudoUrl: '', grado: '9-2' }
  ];

  assert.deepEqual(attachMatchTeamDetails({
    equipoLocalId: 'team-a',
    equipoVisitanteId: 'team-b'
  }, teams), {
    homeTeamLogo: '/images/selecciones/colombia.png',
    awayTeamLogo: '',
    homeTeamGrade: '10-1',
    awayTeamGrade: '9-2'
  });
  assert.deepEqual(attachMatchTeamDetails({ equipo_a: 'Águilas', equipo_b: 'Leones' }, teams), {
    homeTeamLogo: '/images/selecciones/colombia.png',
    awayTeamLogo: '',
    homeTeamGrade: '10-1',
    awayTeamGrade: '9-2'
  });
});

test('buildStandings calcula puntos y estadísticas solo con partidos finalizados', () => {
  const teams = [
    { id: 'team-a', nombre: 'Águilas', categoria: 'Categoría A', escudoUrl: '/images/banderas/colombia.svg' },
    { id: 'team-b', nombre: 'Leones', categoria: 'Categoría A' }
  ];
  const matches = [
    { equipoLocalId: 'team-a', equipoVisitanteId: 'team-b', goles_a: 2, goles_b: 1, estado: 'Finalizado' },
    { equipoLocalId: 'team-a', equipoVisitanteId: 'team-b', goles_a: 1, goles_b: 1, estado: 'Finalizado' },
    { equipoLocalId: 'team-b', equipoVisitanteId: 'team-a', goles_a: 4, goles_b: 0, estado: 'Jugando' },
    { equipoLocalId: 'team-b', equipoVisitanteId: 'team-a', goles_a: 5, goles_b: 0, estado: 'Pendiente' }
  ];

  const [leader, second] = buildStandings(teams, matches);

  assert.equal(leader.id, 'team-a');
  assert.equal(leader.escudoUrl, '/images/selecciones/colombia.png');
  assert.deepEqual(
    [leader.played, leader.won, leader.drawn, leader.lost, leader.goalsFor, leader.goalsAgainst, leader.goalDifference, leader.points],
    [2, 1, 1, 0, 3, 2, 1, 4]
  );
  assert.equal(second.played, 2);
  assert.equal(second.points, 1);
});
