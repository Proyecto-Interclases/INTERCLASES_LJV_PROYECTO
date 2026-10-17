const LINEUP_GROUPS = [
  { id: 'goalkeeper', label: 'Portería', positions: new Set(['portero', 'portera', 'arquero', 'arquera', 'goalkeeper', 'gk', 'por']) },
  { id: 'defense', label: 'Defensa', positions: new Set(['defensa', 'defensor', 'defensora', 'defender', 'lateral', 'central', 'zaguero', 'zaguera', 'df', 'dfc', 'ld', 'li']) },
  { id: 'midfield', label: 'Mediocampo', positions: new Set(['mediocampo', 'mediocampista', 'volante', 'medio', 'midfielder', 'midfield', 'mc', 'mcd', 'mco', 'md', 'mi']) },
  { id: 'attack', label: 'Ataque', positions: new Set(['delantero', 'delantera', 'atacante', 'extremo', 'punta', 'forward', 'striker', 'dc', 'st', 'ed', 'ei']) }
];
const PLAYER_SORT_LOCALE = 'es';

function normalizePosition(position) {
  return String(position || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getLineupGroup(position) {
  const normalized = normalizePosition(position);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const group of LINEUP_GROUPS) {
    if (tokens.some((token) => group.positions.has(token))) return group.id;
  }
  return 'other';
}

function comparePlayers(left, right) {
  const leftNumber = Number(left.numero_camiseta);
  const rightNumber = Number(right.numero_camiseta);
  const shirtNumberOrder = (Number.isFinite(leftNumber) ? leftNumber : 0)
    - (Number.isFinite(rightNumber) ? rightNumber : 0);
  return shirtNumberOrder
    || String(left.nombre || '').localeCompare(String(right.nombre || ''), PLAYER_SORT_LOCALE)
    || String(left.id || left._id || '').localeCompare(String(right.id || right._id || ''));
}

function groupPlayersByPosition(players = []) {
  const groups = LINEUP_GROUPS.map(({ id, label }) => ({ id, label, players: [] }));
  const byId = new Map(groups.map((group) => [group.id, group]));
  const unknown = { id: 'other', label: 'Otras posiciones', players: [] };

  (Array.isArray(players) ? players : []).filter((player) => player && typeof player === 'object').forEach((player) => {
    const group = byId.get(getLineupGroup(player.posicion)) || unknown;
    group.players.push(player);
  });

  [...groups, unknown].forEach((group) => {
    group.players.sort(comparePlayers);
  });
  return [...groups, ...(unknown.players.length ? [unknown] : [])];
}

// Football five uses a fixed 2-2-1 shape. Assign known roles first, then fill
// open slots from the remaining roster in shirt-number/name order. This keeps
// identified keepers and outfield players in their natural lines when possible.
function buildFootballLineup(players = []) {
  const roster = (Array.isArray(players) ? players : [])
    .filter((player) => player && typeof player === 'object')
    .map((player, index) => ({ player, index, group: getLineupGroup(player.posicion) }))
    .sort((left, right) => comparePlayers(left.player, right.player) || left.index - right.index);
  const chosen = new Set();

  function take(groupIds, role) {
    const selected = roster.find((entry) => !chosen.has(entry.index) && groupIds.includes(entry.group));
    if (!selected) return null;
    chosen.add(selected.index);
    return { ...selected.player, lineupRole: role };
  }

  const attack = [take(['attack'], 'Delantero'), take(['attack'], 'Delantero')];
  const midfield = [
    take(['defense'], 'Defensa'),
    take(['midfield'], 'Mediocampista')
  ];
  // If only one of defense/midfield is represented, use its remaining players
  // before drawing from unknown or out-of-position players.
  midfield.forEach((player, index) => {
    if (!player) midfield[index] = take(['defense', 'midfield'], 'Defensa / mediocampista');
  });
  const goalkeeper = [take(['goalkeeper'], 'Portero')];

  const slots = [
    ...attack.map((player) => ({ player, role: 'Delantero' })),
    ...midfield.map((player) => ({ player, role: 'Defensa / mediocampista' })),
    ...goalkeeper.map((player) => ({ player, role: 'Portero' }))
  ];
  slots.forEach((slot) => {
    if (slot.player) return;
    const fallback = roster.find((entry) => !chosen.has(entry.index));
    if (!fallback) return;
    chosen.add(fallback.index);
    slot.player = { ...fallback.player, lineupRole: slot.role };
  });

  const lines = [
    { id: 'attack', label: 'Delanteros', players: slots.slice(0, 2).map((slot) => slot.player) },
    { id: 'midfield', label: 'Defensas y mediocampistas', players: slots.slice(2, 4).map((slot) => slot.player) },
    { id: 'goalkeeper', label: 'Portero', players: slots.slice(4, 5).map((slot) => slot.player) }
  ];
  lines.forEach((line) => {
    line.players = line.players.map((player, index) => player || {
      isPlaceholder: true,
      lineupRole: line.id === 'attack' ? 'Delantero' : line.id === 'goalkeeper'
        ? 'Portero'
        : index === 0 ? 'Defensa' : 'Mediocampista'
    });
  });

  return {
    lines,
    bench: roster
      .filter((entry) => !chosen.has(entry.index))
      .map(({ player }) => player)
  };
}

module.exports = { getLineupGroup, groupPlayersByPosition, buildFootballLineup, comparePlayers };
