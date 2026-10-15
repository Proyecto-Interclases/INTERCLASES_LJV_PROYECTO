const SPORTS = Object.freeze([
  { id: 'futbol', name: 'Fútbol' },
  { id: 'baloncesto', name: 'Baloncesto' },
  { id: 'voleibol', name: 'Voleibol' }
]);

const SPORT_IDS = Object.freeze(SPORTS.map(({ id }) => id));

function normalizeSport(value) {
  const sport = String(value || '').trim().toLowerCase();
  return SPORT_IDS.includes(sport) ? sport : 'futbol';
}

function sportQuery(sport) {
  const normalized = normalizeSport(sport);
  if (normalized !== 'futbol') return { deporte: normalized };
  return {
    $or: [
      { deporte: 'futbol' },
      { deporte: { $exists: false } },
      { deporte: null },
      { deporte: '' }
    ]
  };
}

module.exports = { SPORTS, SPORT_IDS, normalizeSport, sportQuery };
