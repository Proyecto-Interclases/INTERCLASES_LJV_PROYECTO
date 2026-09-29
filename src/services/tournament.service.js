const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');

function normalizeMatchStatus(status = 'Por jugar') {
  const normalized = String(status).trim().toLowerCase();
  if (['finalizado', 'completado', 'terminado'].includes(normalized)) return 'Finalizado';
  if (['jugando', 'en vivo'].includes(normalized)) return 'Jugando';
  return 'Por jugar';
}

function buildStandings(teams, matches) {
  const rows = new Map();
  const idsByName = new Map();

  teams.forEach((team) => {
    const id = team._id ? team._id.toString() : String(team.id);
    rows.set(id, {
      id,
      name: team.nombre || team.name,
      category: team.categoria || team.category,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    });
    idsByName.set(team.nombre || team.name, id);
  });

  matches.forEach((match) => {
    if (normalizeMatchStatus(match.estado || match.status) !== 'Finalizado') return;

    const homeId = match.equipoLocalId?.toString() || match.homeTeamId || idsByName.get(match.equipo_a || match.homeTeam);
    const awayId = match.equipoVisitanteId?.toString() || match.awayTeamId || idsByName.get(match.equipo_b || match.awayTeam);
    const home = rows.get(homeId);
    const away = rows.get(awayId);
    if (!home || !away || home === away) return;

    const homeScore = Number(match.goles_a ?? match.goles_local ?? match.homeScore);
    const awayScore = Number(match.goles_b ?? match.goles_visitante ?? match.awayScore);
    if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (awayScore > homeScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  return [...rows.values()]
    .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort((first, second) => second.points - first.points
      || second.goalDifference - first.goalDifference
      || second.goalsFor - first.goalsFor
      || first.name.localeCompare(second.name));
}

async function getTeams() {
  const teams = await Team.find({}).sort({ nombre: 1 }).lean();

  return teams.map((team) => ({
    id: team._id.toString(),
    name: team.nombre,
    category: team.categoria
  }));
}

async function getMatches() {
  const matches = await Match.find({}).sort({ fecha: 1, hora: 1 }).lean();

  return matches.map((match) => ({
    id: match._id.toString(),
    homeTeamId: match.equipoLocalId ? match.equipoLocalId.toString() : null,
    awayTeamId: match.equipoVisitanteId ? match.equipoVisitanteId.toString() : null,
    date: match.fecha,
    time: match.hora,
    field: match.cancha,
    status: normalizeMatchStatus(match.estado),
    homeScore: match.goles_a !== undefined ? match.goles_a : (match.goles_local ?? 0),
    awayScore: match.goles_b !== undefined ? match.goles_b : (match.goles_visitante ?? 0),
    homeTeam: match.equipo_a || 'Equipo local',
    awayTeam: match.equipo_b || 'Equipo visitante',
    result: match.resultado || `${match.equipo_a || 'Equipo local'} ${match.goles_a ?? match.goles_local ?? 0} - ${match.goles_b ?? match.goles_visitante ?? 0} ${match.equipo_b || 'Equipo visitante'}`
  }));
}

async function getCalendarMatches() {
  const rawMatches = await Match.find({}).sort({ fecha: 1, hora: 1 }).lean();

  const formattedMatches = rawMatches.map((match) => {
    const homeTeam = match.equipo_a || 'Equipo local';
    const awayTeam = match.equipo_b || 'Equipo visitante';
    const homeScore = Number(match.goles_a !== undefined ? match.goles_a : (match.goles_local ?? 0));
    const awayScore = Number(match.goles_b !== undefined ? match.goles_b : (match.goles_visitante ?? 0));
    const status = normalizeMatchStatus(match.estado);

    let winner = 'draw';
    if (homeScore > awayScore) winner = 'home';
    else if (awayScore > homeScore) winner = 'away';

    return {
      id: match._id ? match._id.toString() : '',
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      winner,
      date: match.fecha || 'Fecha por definir',
      time: match.hora || 'Hora por definir',
      field: match.cancha || 'Cancha principal',
      status,
      result: match.resultado || `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`
    };
  });

  const upcoming = formattedMatches.filter((m) => {
    return m.status === 'Por jugar' || m.status === 'Jugando';
  });

  const finished = formattedMatches.filter((m) => {
    return m.status === 'Finalizado';
  });

  return {
    upcoming,
    finished,
    all: formattedMatches
  };
}

async function getSummary() {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);

  return {
    teamCount: teams.length,
    matchCount: matches.length,
    nextMatch: matches[0] || null
  };
}

async function getStandings(category) {
  const filter = category ? { categoria: category } : {};
  const teams = await Team.find(filter).sort({ nombre: 1 }).lean();
  const matches = await Match.find({}).lean();
  return buildStandings(teams, matches);
}

async function getTeamsPageData(category) {
  const filter = category ? { categoria: category } : {};
  const [teams, players, categories] = await Promise.all([
    Team.find(filter).sort({ categoria: 1, nombre: 1 }).lean(),
    Player.find({}).populate('equipo_id').sort({ numero_camiseta: 1, nombre: 1 }).lean(),
    Team.distinct('categoria')
  ]);

  const teamsWithRoster = teams.map((team) => ({
    ...team,
    _id: team._id.toString(),
    jugadores: players
      .filter((player) => player.equipo_id && player.equipo_id._id.toString() === team._id.toString())
      .map((player) => ({
        nombre: player.nombre,
        posicion: player.posicion,
        numero_camiseta: player.numero_camiseta || 0,
        goles: player.goles || 0
      }))
  }));

  return { teams: teamsWithRoster, categories: categories.sort(), selectedCategory: category || '' };
}

async function getTopScorers(limit = 10, category) {
  const teamFilter = category ? await Team.find({ categoria: category }).distinct('_id') : null;
  const playerFilter = { goles: { $gt: 0 }, ...(teamFilter ? { equipo_id: { $in: teamFilter } } : {}) };
  const players = await Player.find(playerFilter).populate('equipo_id').sort({ goles: -1, nombre: 1 }).limit(limit).lean();
  return players.map((player) => ({
    nombre: player.nombre,
    posicion: player.posicion,
    numero_camiseta: player.numero_camiseta || 0,
    goles: player.goles || 0,
    equipo: player.equipo_id ? player.equipo_id.nombre : 'Sin equipo',
    escudoUrl: player.equipo_id ? player.equipo_id.escudoUrl : ''
  }));
}

module.exports = { getTeams, getMatches, getCalendarMatches, getSummary, getStandings, getTeamsPageData, getTopScorers, buildStandings };
