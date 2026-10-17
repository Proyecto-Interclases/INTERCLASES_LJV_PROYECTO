const test = require('node:test');
const assert = require('node:assert/strict');
const { sortTeamsByGrade } = require('../src/services/team-order.service');

test('sorts each category by grade descending and places Germany after grade 11-2', () => {
  const teams = [
    { nombre: 'Equipo de noveno', categoria: 'Categoría A', grado: '9.º 1' },
    { nombre: 'Alemania', categoria: 'Categoría A', grado: '9.º 1, 10.º 1 y 11.º 1' },
    { nombre: 'Equipo de décimo', categoria: 'Categoría A', grado: '10.º 3' },
    { nombre: 'Equipo 11-2', categoria: 'Categoría A', grado: '11.º 2' },
    { nombre: 'Equipo 11-1', categoria: 'Categoría A', grado: '11.º 1' },
    { nombre: 'Equipo de octavo', categoria: 'Categoría B', grado: '8.º 2' },
    { nombre: 'Equipo de décimo categoría B', categoria: 'Categoría B', grado: '10.º 1' }
  ];

  assert.deepEqual(
    sortTeamsByGrade(teams).map((team) => team.nombre),
    ['Equipo 11-1', 'Equipo 11-2', 'Alemania', 'Equipo de décimo categoría B', 'Equipo de décimo', 'Equipo de noveno', 'Equipo de octavo']
  );
});

test('orders records without a parseable grade after graded teams', () => {
  assert.deepEqual(
    sortTeamsByGrade([
      { nombre: 'Sin grado', categoria: 'Categoría A', grado: '' },
      { nombre: 'Séptimo', categoria: 'Categoría A', grado: '7-1' }
    ]).map((team) => team.nombre),
    ['Séptimo', 'Sin grado']
  );
});

test('supports ascending grade order when requested', () => {
  assert.deepEqual(
    sortTeamsByGrade([
      { nombre: 'Grado 11-2', categoria: 'Categoría A', grado: '11.º 2' },
      { nombre: 'Grado 7-1', categoria: 'Categoría A', grado: '7.º 1' },
      { nombre: 'Grado 9-3', categoria: 'Categoría A', grado: '9.º 3' }
    ], 'asc').map((team) => team.nombre),
    ['Grado 7-1', 'Grado 9-3', 'Grado 11-2']
  );
});
