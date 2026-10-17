const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getLineupGroup,
  groupPlayersByPosition,
  buildFootballLineup
} = require('../src/services/player-lineup.service');
const { isManagedPlayerPhotoUrl } = require('../src/services/player-photo.service');

test('player positions map common Spanish and football abbreviations to tactical lines', () => {
  assert.equal(getLineupGroup('Portero'), 'goalkeeper');
  assert.equal(getLineupGroup('Arquera'), 'goalkeeper');
  assert.equal(getLineupGroup('Defensa central'), 'defense');
  assert.equal(getLineupGroup('Lateral izquierdo'), 'defense');
  assert.equal(getLineupGroup('Mediocampista'), 'midfield');
  assert.equal(getLineupGroup('MCD'), 'midfield');
  assert.equal(getLineupGroup('Delantero'), 'attack');
  assert.equal(getLineupGroup('Extremo derecho'), 'attack');
  assert.equal(getLineupGroup(''), 'other');
});

test('lineup groups follow pitch order and sort each line by shirt number', () => {
  const lines = groupPlayersByPosition([
    { nombre: 'Forward', posicion: 'Delantero', numero_camiseta: 9 },
    { nombre: 'Keeper', posicion: 'Portero', numero_camiseta: 1 },
    { nombre: 'Wide', posicion: 'Lateral', numero_camiseta: 3 },
    { nombre: 'Mid', posicion: 'Volante', numero_camiseta: 6 },
    { nombre: 'Unknown', posicion: '', numero_camiseta: 12 },
    { nombre: 'Other defender', posicion: 'Defensa', numero_camiseta: 2 }
  ]);

  assert.deepEqual(lines.map(({ id }) => id), ['goalkeeper', 'defense', 'midfield', 'attack', 'other']);
  assert.deepEqual(lines.find(({ id }) => id === 'defense').players.map(({ numero_camiseta }) => numero_camiseta), [2, 3]);
  assert.equal(lines.at(-1).players[0].nombre, 'Unknown');
});

test('football-five lineup always assigns two forwards, two midfield-line players and a keeper', () => {
  const players = [
    { id: 'fwd-9', nombre: 'Forward Nine', posicion: 'Delantero', numero_camiseta: 9 },
    { id: 'keeper', nombre: 'Keeper', posicion: 'Portero', numero_camiseta: 1 },
    { id: 'defender', nombre: 'Defender', posicion: 'Defensa', numero_camiseta: 4 },
    { id: 'midfielder', nombre: 'Midfielder', posicion: 'Volante', numero_camiseta: 6 },
    { id: 'fwd-7', nombre: 'Forward Seven', posicion: 'Extremo', numero_camiseta: 7 },
    { id: 'bench-12', nombre: 'Bench Twelve', posicion: 'Delantero', numero_camiseta: 12 },
    { id: 'bench-2', nombre: 'Bench Two', posicion: 'Sin posición', numero_camiseta: 2 }
  ];

  const { lines, bench } = buildFootballLineup(players);
  assert.deepEqual(lines.map(({ id, players: linePlayers }) => [id, linePlayers.length]), [
    ['attack', 2],
    ['midfield', 2],
    ['goalkeeper', 1]
  ]);
  assert.deepEqual(lines[0].players.map(({ id }) => id), ['fwd-7', 'fwd-9']);
  assert.deepEqual(lines[1].players.map(({ id }) => id), ['defender', 'midfielder']);
  assert.equal(lines[2].players[0].id, 'keeper');
  assert.deepEqual(bench.map(({ id }) => id), ['bench-2', 'bench-12']);
  assert.equal(new Set([...lines.flatMap((line) => line.players.map(({ id }) => id)), ...bench.map(({ id }) => id)]).size, players.length);
});

test('football-five selection is deterministic with repeated and unknown roles', () => {
  const players = [
    { nombre: 'A Forward', posicion: 'Delantero', numero_camiseta: 10 },
    { nombre: 'B Forward', posicion: 'Delantero', numero_camiseta: 10 },
    { nombre: 'C Forward', posicion: 'Delantero', numero_camiseta: 11 },
    { nombre: 'Unknown A', posicion: 'Híbrido', numero_camiseta: 3 },
    { nombre: 'Unknown B', posicion: '', numero_camiseta: 4 },
    { nombre: 'Unknown C', posicion: null, numero_camiseta: 5 }
  ];

  const first = buildFootballLineup(players);
  const again = buildFootballLineup(players);
  assert.deepEqual(first.lines.map(({ players: line }) => line.map((player) => player.nombre)), [
    ['A Forward', 'B Forward'],
    ['Unknown A', 'Unknown B'],
    ['Unknown C']
  ]);
  assert.deepEqual(first, again);
  assert.deepEqual(first.bench.map(({ nombre }) => nombre), ['C Forward']);
});

test('short and empty rosters leave accessible-ready vacancies instead of fabricating players', () => {
  const short = buildFootballLineup([
    { nombre: 'Real Keeper', posicion: 'GK', numero_camiseta: 1 },
    { nombre: 'Real Player', posicion: 'Indefinido', numero_camiseta: 2 }
  ]);
  const slots = short.lines.flatMap((line) => line.players);
  assert.equal(slots.length, 5);
  assert.equal(slots.filter(({ isPlaceholder }) => isPlaceholder).length, 3);
  assert.deepEqual(short.bench, []);
  assert.equal(short.lines[2].players[0].nombre, 'Real Keeper');
  assert.equal(slots.filter(({ isPlaceholder }) => !isPlaceholder).length, 2);

  const empty = buildFootballLineup();
  assert.equal(empty.lines.flatMap((line) => line.players).length, 5);
  assert.equal(empty.lines.flatMap((line) => line.players).every(({ isPlaceholder }) => isPlaceholder), true);
  assert.deepEqual(empty.bench, []);
});

test('only application-managed player photo paths are exposed as player photos', () => {
  assert.equal(isManagedPlayerPhotoUrl('/uploads/jugadores/jugador-123e4567-e89b-42d3-a456-426614174000.jpg'), true);
  assert.equal(isManagedPlayerPhotoUrl('data:image/png;base64,AAAA'), false);
  assert.equal(isManagedPlayerPhotoUrl('https://example.org/photo.jpg'), false);
  assert.equal(isManagedPlayerPhotoUrl('/uploads/jugadores/../../secret.jpg'), false);
});
