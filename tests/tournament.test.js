const test = require('node:test');
const assert = require('node:assert/strict');

const { buildStandings } = require('../src/services/tournament.service');

test('buildStandings calcula puntos y estadísticas solo con partidos finalizados', () => {
  const teams = [
    { id: 'team-a', nombre: 'Águilas', categoria: 'Bachillerato' },
    { id: 'team-b', nombre: 'Leones', categoria: 'Bachillerato' }
  ];
  const matches = [
    { equipoLocalId: 'team-a', equipoVisitanteId: 'team-b', goles_a: 2, goles_b: 1, estado: 'Finalizado' },
    { equipoLocalId: 'team-a', equipoVisitanteId: 'team-b', goles_a: 1, goles_b: 1, estado: 'Finalizado' },
    { equipoLocalId: 'team-b', equipoVisitanteId: 'team-a', goles_a: 4, goles_b: 0, estado: 'Jugando' },
    { equipoLocalId: 'team-b', equipoVisitanteId: 'team-a', goles_a: 5, goles_b: 0, estado: 'Pendiente' }
  ];

  const [leader, second] = buildStandings(teams, matches);

  assert.equal(leader.id, 'team-a');
  assert.deepEqual(
    [leader.played, leader.won, leader.drawn, leader.lost, leader.goalsFor, leader.goalsAgainst, leader.goalDifference, leader.points],
    [2, 1, 1, 0, 3, 2, 1, 4]
  );
  assert.equal(second.played, 2);
  assert.equal(second.points, 1);
});
