const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Announcement = require('../models/Announcement');
const User = require('../models/User');

const MATCH_STATUSES = ['Por jugar', 'Jugando', 'Finalizado'];

async function getPopup() {
  const popup = await Announcement.findOne({}).sort({ createdAt: -1 }).lean();
  return popup || { titulo: '¡Bienvenidos!', mensaje: '', activo: 1 };
}

async function updatePopup({ titulo, mensaje, activo }) {
  const cleanTitle = String(titulo || '').trim();
  const cleanMessage = String(mensaje || '').trim();

  if (!cleanTitle || !cleanMessage) {
    throw new Error('El título y el mensaje del pop-up son obligatorios.');
  }

  return Announcement.create({
    titulo: cleanTitle,
    mensaje: cleanMessage,
    activo: Boolean(activo)
  });
}

async function listAdminTeams() {
  const teams = await Team.find({}).sort({ categoria: 1, nombre: 1 }).lean();
  return teams.map((team) => ({ ...team, id: team._id.toString() }));
}

async function updateTeamStats({ teamId, puntos, golesFavor, golesContra }) {
  const values = [Number(puntos), Number(golesFavor), Number(golesContra)];
  if (!teamId || values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('Las estadísticas del equipo deben ser números enteros positivos.');
  }

  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error('No existe ese equipo.');
  }

  team.puntos = Number(puntos);
  team.goles_favor = Number(golesFavor);
  team.goles_contra = Number(golesContra);
  await team.save();

  return team.toObject();
}

async function listPlayers() {
  const players = await Player.find({}).populate('equipo_id').sort({ nombre: 1 }).lean();

  return players.map((player) => ({
    id: player._id.toString(),
    equipo_id: player.equipo_id ? player.equipo_id._id.toString() : null,
    nombre: player.nombre,
    posicion: player.posicion,
    numero_camiseta: player.numero_camiseta || 0,
    goles: player.goles || 0,
    equipo_nombre: player.equipo_id ? player.equipo_id.nombre : null
  }));
}

async function updatePlayerGoals(playerId, goals) {
  const goalCount = Number(goals);
  if (!playerId || !Number.isInteger(goalCount) || goalCount < 0) {
    throw new Error('Los goles deben ser un número entero no negativo.');
  }

  const player = await Player.findById(playerId);
  if (!player) throw new Error('No existe ese jugador.');

  player.goles = goalCount;
  await player.save();
  return player.toObject();
}

async function listUsers() {
  return User.find({}, 'nombre email role creado_en teamName')
    .sort({ creado_en: 1 })
    .lean();
}

async function updateMatch({ matchId, equipoLocalId, equipoVisitanteId, fechaPartido, horaPartido, cancha, estado }) {
  if (!equipoLocalId || !equipoVisitanteId || equipoLocalId === equipoVisitanteId || !fechaPartido || !horaPartido || !cancha) {
    throw new Error('Completa todos los datos del partido y usa equipos diferentes.');
  }

  if (!MATCH_STATUSES.includes(estado)) {
    throw new Error('El estado del partido no es válido.');
  }

  const match = await Match.findById(matchId);

  if (!match) {
    throw new Error('No existe ese partido.');
  }

  const local = await Team.findById(equipoLocalId);
  const visitante = await Team.findById(equipoVisitanteId);

  if (!local || !visitante) {
    throw new Error('Los equipos del partido no existen.');
  }

  match.equipoLocalId = local._id;
  match.equipoVisitanteId = visitante._id;
  match.equipo_a = local.nombre;
  match.equipo_b = visitante.nombre;
  match.fecha = fechaPartido;
  match.hora = horaPartido;
  match.cancha = String(cancha).trim();
  match.estado = estado;
  await match.save();

  return match.toObject();
}

async function deleteMatch(matchId) {
  const match = await Match.findByIdAndDelete(matchId);
  if (!match) throw new Error('No existe ese partido.');
  return match;
}

async function deletePlayer(playerId) {
  const player = await Player.findByIdAndDelete(playerId);
  if (!player) throw new Error('No existe ese jugador.');
  return player;
}

module.exports = {
  MATCH_STATUSES,
  getPopup,
  updatePopup,
  listAdminTeams,
  updateTeamStats,
  listPlayers,
  updatePlayerGoals,
  listUsers,
  updateMatch,
  deleteMatch,
  deletePlayer
};
