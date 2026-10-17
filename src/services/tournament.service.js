const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { normalizeSport, sportQuery } = require('../constants/sports');
const { isManagedPlayerPhotoUrl } = require('./player-photo.service');
const { groupPlayersByPosition, buildFootballLineup } = require('./player-lineup.service');

function normalizeMatchStatus(status = 'Por jugar') {
  const normalized = String(status).trim().toLowerCase();
  if (['finalizado', 'completado', 'terminado'].includes(normalized)) return 'Finalizado';
  if (['jugando', 'en vivo'].includes(normalized)) return 'Jugando';
  return 'Por jugar';
}

function formatTeamGrades(grades) {
  return [...new Set(grades.map((grade) => String(grade || '').trim()).filter(Boolean))]
    .map((grade) => grade.replace(/(\d+)\.º\s*(\d+)/g, '$1-$2'))
    .join(', ');
}

function buildStandings(teams, matches, selectedSport = 'futbol') {
  const sport = normalizeSport(selectedSport);
  const rows = new Map();
  const idsByName = new Map();
  const sportsById = new Map();

  teams.forEach((team) => {
    const id = team._id ? team._id.toString() : String(team.id);
    const teamSport = normalizeSport(team.deporte);
    if (teamSport !== sport) return;
    sportsById.set(id, teamSport);
    rows.set(id, {
      id,
      name: team.nombre || team.name,
      category: team.categoria || team.category,
      deporte: teamSport,
      escudoUrl: team.escudoUrl || '',
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
    if (normalizeSport(match.deporte) !== sport) return;

    const homeId = match.equipoLocalId?.toString() || match.homeTeamId || idsByName.get(match.equipo_a || match.homeTeam);
    const awayId = match.equipoVisitanteId?.toString() || match.awayTeamId || idsByName.get(match.equipo_b || match.awayTeam);
    const home = rows.get(homeId);
    const away = rows.get(awayId);
    if (!home || !away || home === away
      || sportsById.get(homeId) !== sport || sportsById.get(awayId) !== sport) return;

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

async function getTeams(selectedSport = 'futbol') {
  const teams = await Team.find(sportQuery(selectedSport)).sort({ nombre: 1 }).lean();

  return teams.map((team) => ({
    id: team._id.toString(),
    name: team.nombre,
    category: team.categoria,
    deporte: normalizeSport(team.deporte),
    escudoUrl: team.escudoUrl || ''
  }));
}

async function getMatches(selectedSport = 'futbol') {
  const matches = await Match.find(sportQuery(selectedSport)).sort({ fecha: 1, hora: 1 }).lean();

  return matches.map((match) => ({
    id: match._id.toString(),
    deporte: normalizeSport(match.deporte),
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

async function getCalendarMatches(selectedSport = 'futbol') {
  const rawMatches = await Match.find(sportQuery(selectedSport)).sort({ fecha: 1, hora: 1 }).lean();

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
      deporte: normalizeSport(match.deporte),
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

async function getSummary(selectedSport = 'futbol') {
  const [teams, matches] = await Promise.all([getTeams(selectedSport), getMatches(selectedSport)]);

  return {
    teamCount: teams.length,
    matchCount: matches.length,
    nextMatch: matches[0] || null
  };
}

async function getStandings(category, selectedSport = 'futbol') {
  const sport = normalizeSport(selectedSport);
  const baseFilter = sportQuery(sport);
  const filter = category ? { ...baseFilter, categoria: category } : baseFilter;
  const teams = await Team.find(filter).sort({ nombre: 1 }).lean();
  const matches = await Match.find(sportQuery(sport)).lean();
  return buildStandings(teams, matches, sport);
}

async function getTeamsPageData(category, selectedSport = 'futbol') {
  const sport = normalizeSport(selectedSport);
  const baseFilter = sportQuery(sport);
  const filter = category ? { ...baseFilter, categoria: category } : baseFilter;
  const teamIds = await Team.find(filter).distinct('_id');
  const [teams, players, categories] = await Promise.all([
    Team.find(filter).sort({ categoria: 1, nombre: 1 }).lean(),
    Player.find({ equipo_id: { $in: teamIds } }).populate('equipo_id').sort({ numero_camiseta: 1, nombre: 1 }).lean(),
    Team.find(baseFilter).distinct('categoria')
  ]);

  const teamsWithRoster = teams.map((team) => {
    const teamPlayers = players.filter((player) => (
      player.equipo_id && player.equipo_id._id.toString() === team._id.toString()
    ));
    const roster = teamPlayers.map((player) => ({
      nombre: player.nombre,
      grado: player.grado || '',
      posicion: player.posicion,
      fotoUrl: isManagedPlayerPhotoUrl(player.fotoUrl) ? player.fotoUrl : '',
      numero_camiseta: player.numero_camiseta || 0,
      goles: player.goles || 0
    }));
    const footballLineup = buildFootballLineup(roster);
    return {
      ...team,
      _id: team._id.toString(),
      grado: formatTeamGrades(teamPlayers.map((player) => player.grado)),
      jugadores: roster,
      alineacion: sport === 'futbol'
        ? footballLineup.lines
        : groupPlayersByPosition(roster),
      banca: sport === 'futbol' ? footballLineup.bench : []
    };
  });

  return { teams: teamsWithRoster, categories: categories.sort(), selectedCategory: category || '' };
}

async function getTopScorers(limit = 10, category, selectedSport = 'futbol') {
  const teamQuery = { ...sportQuery(selectedSport), ...(category ? { categoria: category } : {}) };
  const teamFilter = await Team.find(teamQuery).distinct('_id');
  const playerFilter = { goles: { $gt: 0 }, equipo_id: { $in: teamFilter } };
  const players = await Player.find(playerFilter).populate('equipo_id').sort({ goles: -1, nombre: 1 }).limit(limit).lean();
  return players.map((player) => ({
    nombre: player.nombre,
    grado: player.grado || '',
    posicion: player.posicion,
    fotoUrl: isManagedPlayerPhotoUrl(player.fotoUrl) ? player.fotoUrl : '',
    numero_camiseta: player.numero_camiseta || 0,
    goles: player.goles || 0,
    equipo: player.equipo_id ? player.equipo_id.nombre : 'Sin equipo',
    escudoUrl: player.equipo_id ? player.equipo_id.escudoUrl : ''
  }));
}

module.exports = { getTeams, getMatches, getCalendarMatches, getSummary, getStandings, getTeamsPageData, getTopScorers, buildStandings, formatTeamGrades };
