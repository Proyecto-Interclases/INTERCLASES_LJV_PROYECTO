const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const TEAM_CATEGORIES = require('../constants/team-categories');
const { SPORT_IDS, normalizeSport } = require('../constants/sports');
const { isManagedPlayerPhotoUrl, removePlayerPhoto } = require('./player-photo.service');
const { sortTeamsByGrade } = require('./team-order.service');
const { getTeamCrestUrl } = require('./team-crest.service');
const { normalizeShirtNumber } = require('./shirt-number.service');

const MATCH_STATUSES = ['Por jugar', 'Jugando', 'Finalizado'];
const ANNOUNCEMENT_TAGS = new Set(['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'a']);

function matchLiveConflict(error) {
  if (error?.code === 11000 && error?.keyPattern?.deporte) {
    return new Error('Ya hay un partido en vivo para este deporte. Finalízalo antes de iniciar otro.');
  }
  return error;
}

function requirePayload(payload, label) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`${label} no se recibieron correctamente.`);
  }
  return payload;
}

function exactCaseInsensitive(value) {
  return new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

function sanitizeAnnouncementHtml(input) {
  const html = String(input || '').trim();
  if (html.length > 5000) throw new Error('El mensaje no puede superar los 5000 caracteres.');

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|svg|iframe|object|embed|form)\b[^>]*\/?>/gi, '')
    .replace(/<([^>]+)>/g, (whole, rawTag) => {
      const closing = /^\s*\//.test(rawTag);
      const match = rawTag.match(/^\s*\/?\s*([a-z\d-]+)/i);
      if (!match) return '';
      const tag = match[1].toLowerCase();
      if (!ANNOUNCEMENT_TAGS.has(tag)) return '';
      if (closing) return tag === 'br' ? '' : `</${tag}>`;
      if (tag === 'br') return '<br>';
      if (tag !== 'a') return `<${tag}>`;
      const hrefMatch = rawTag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '').trim();
      const safeHref = /^(?:https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(href || '');
      if (!href || !safeHref || /[\u0000-\u001f]/.test(href)) return '<a>';
      return `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" rel="nofollow noopener noreferrer">`;
    });
}

async function getPopup() {
  const popup = await Announcement.findOne({}).sort({ createdAt: -1 }).lean();
  if (!popup) return { titulo: '¡Bienvenidos!', mensaje: '', activo: 1, imagenUrl: '' };
  const imagenes = popup.imagenes?.length ? popup.imagenes : (popup.imagenUrl ? [popup.imagenUrl] : []);
  return { ...popup, mensaje: sanitizeAnnouncementHtml(popup.mensaje), imagenes, imagenUrl: popup.imagenUrl || imagenes[0] || '' };
}

async function updatePopup(payload) {
  const { titulo, mensaje, activo, imagenUrl, imagenes } = requirePayload(payload, 'Los datos del aviso');
  const cleanTitle = String(titulo || '').trim();
  const cleanMessage = sanitizeAnnouncementHtml(mensaje);
  let cleanImageUrl = String(imagenUrl || '').trim();
  let cleanImages = Array.isArray(imagenes) ? imagenes.map((image) => String(image || '').trim()).filter(Boolean) : [];
  const isAllowedImageUrl = (url) => /^https:\/\/[^\s]+$/i.test(url)
    || /^\/uploads\/anuncios\/anuncio-[a-f\d-]+\.(?:jpg|jpeg|png|webp)$/i.test(url)
    || /^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/]+=*$/i.test(url);
  if (cleanImageUrl && !isAllowedImageUrl(cleanImageUrl)) {
    throw new Error('La imagen del anuncio debe ser JPG, PNG o WebP o una URL HTTPS.');
  }
  if (cleanImages.length > 5 || cleanImages.some((image) => !isAllowedImageUrl(image))) {
    throw new Error('El anuncio admite hasta cinco imágenes JPG, PNG o WebP.');
  }
  if (cleanImages.some((image) => image.length > 4300000)) throw new Error('Una imagen del anuncio supera el tamaño permitido.');

  if (!cleanTitle || !cleanMessage) {
    throw new Error('El título y el mensaje del pop-up son obligatorios.');
  }
  if (cleanTitle.length > 140) throw new Error('El título no puede superar los 140 caracteres.');
  if (!cleanImages.length && !cleanImageUrl) {
    const previous = await Announcement.findOne({}).sort({ createdAt: -1 }).lean();
    cleanImages = previous?.imagenes?.length
      ? previous.imagenes
      : (previous?.imagenUrl ? [previous.imagenUrl] : []);
  }
  if (!cleanImageUrl) cleanImageUrl = cleanImages[0] || '';

  return Announcement.create({
    titulo: cleanTitle,
    mensaje: cleanMessage,
    activo: activo === true || activo === '1' || activo === 'on',
    imagenUrl: cleanImageUrl,
    imagenes: cleanImages
  });
}

async function updateTeam(teamId, payload) {
  const { nombre, categoria, escudoUrl, deporte } = requirePayload(payload, 'Los datos del equipo');
  if (!mongoose.isValidObjectId(teamId)) throw new Error('El equipo seleccionado no es válido.');
  const cleanName = String(nombre || '').trim();
  const cleanCategory = String(categoria || '').trim();
  const cleanShield = String(escudoUrl || '').trim();
  if (!cleanName || cleanName.length > 80 || !cleanCategory || cleanCategory.length > 60) {
    throw new Error('El nombre (máximo 80) y la categoría (máximo 60) son obligatorios.');
  }
  if (!TEAM_CATEGORIES.includes(cleanCategory)) {
    throw new Error(`La categoría debe ser una de estas opciones: ${TEAM_CATEGORIES.join(', ')}.`);
  }
  const sport = String(deporte || '').trim().toLowerCase();
  if (!SPORT_IDS.includes(sport)) throw new Error('Selecciona un deporte válido.');
  if (cleanShield && !/^https:\/\/[^\s]+$/i.test(cleanShield)
    && !/^\/images\/selecciones\/[a-z-]+\.png$/i.test(cleanShield)
    && !/^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/]+=*$/i.test(cleanShield)) {
    throw new Error('El escudo debe ser un logo local válido, una URL HTTPS o una imagen JPG, PNG o WebP válida.');
  }

  const team = await Team.findById(teamId);
  if (!team) throw new Error('No existe ese equipo.');
  const duplicate = await Team.findOne({ nombre: exactCaseInsensitive(cleanName), _id: { $ne: team._id } });
  if (duplicate && duplicate.categoria === cleanCategory) throw new Error('Ya existe un equipo con ese nombre en esta categoría.');
  if (duplicate) throw new Error('Ya existe un equipo con ese nombre.');
  if (normalizeSport(team.deporte) !== sport) {
    const linkedMatch = await Match.exists({
      $or: [
        { equipoLocalId: team._id },
        { equipoVisitanteId: team._id },
        { equipo_a: team.nombre },
        { equipo_b: team.nombre }
      ]
    });
    if (linkedMatch) throw new Error('No se puede cambiar el deporte de un equipo con partidos asociados.');
  }

  const oldName = team.nombre;
  team.nombre = cleanName;
  team.categoria = cleanCategory;
  team.deporte = sport;
  if (cleanShield) team.escudoUrl = cleanShield;
  await team.save();

  if (oldName !== cleanName) {
    await Promise.all([
      User.updateMany({ teamName: oldName }, { $set: { teamName: cleanName } }),
      Match.updateMany({ $or: [{ equipoLocalId: team._id }, { equipo_a: oldName }] }, { $set: { equipo_a: cleanName } }),
      Match.updateMany({ $or: [{ equipoVisitanteId: team._id }, { equipo_b: oldName }] }, { $set: { equipo_b: cleanName } })
    ]);
    const finishedMatches = await Match.find({
      estado: 'Finalizado',
      $or: [{ equipoLocalId: team._id }, { equipoVisitanteId: team._id }, { equipo_a: cleanName }, { equipo_b: cleanName }]
    });
    await Promise.all(finishedMatches.map((match) => {
      match.resultado = `${match.equipo_a} ${match.goles_a} - ${match.goles_b} ${match.equipo_b}`;
      return match.save();
    }));
  }
  return team.toObject();
}

async function deleteTeam(teamId) {
  if (!mongoose.isValidObjectId(teamId)) throw new Error('El equipo seleccionado no es válido.');
  const team = await Team.findById(teamId);
  if (!team) throw new Error('No existe ese equipo.');
  const [players, matches] = await Promise.all([
    Player.exists({ equipo_id: team._id }),
    Match.exists({ $or: [{ equipoLocalId: team._id }, { equipoVisitanteId: team._id }, { equipo_a: team.nombre }, { equipo_b: team.nombre }] })
  ]);
  if (players || matches) throw new Error('No se puede eliminar: primero retira sus jugadores y elimina o reasigna sus partidos.');
  await Promise.all([
    User.updateMany({ teamName: team.nombre }, { $set: { teamName: null } }),
    team.deleteOne()
  ]);
  return team;
}

async function listAdminTeams(order = 'desc') {
  const teams = await Team.find({ categoria: { $in: TEAM_CATEGORIES } }).sort({ categoria: 1, nombre: 1 }).lean();
  const captainEmails = teams.map((team) => team.capitanEmail).filter(Boolean);
  const [captains, players] = await Promise.all([
    captainEmails.length
      ? User.find({ email: { $in: captainEmails } }, 'nombre email').lean()
      : Promise.resolve([]),
    Player.find({ equipo_id: { $in: teams.map((team) => team._id) } }, 'equipo_id grado').lean()
  ]);
  const captainsByEmail = new Map(captains.map((captain) => [captain.email, captain]));

  const playersByTeam = new Map();
  players.forEach((player) => {
    const id = player.equipo_id.toString();
    if (!playersByTeam.has(id)) playersByTeam.set(id, []);
    playersByTeam.get(id).push({ grado: player.grado });
  });

  return sortTeamsByGrade(teams.map((team) => ({
    ...team,
    escudoUrl: getTeamCrestUrl(team.escudoUrl),
    id: team._id.toString(),
    deporte: normalizeSport(team.deporte),
    gradoPrincipal: getPrimaryTeamGrade(playersByTeam.get(team._id.toString()) || []),
    capitanNombre: captainsByEmail.get(team.capitanEmail)?.nombre || null
  })), order);
}

async function updateTeamCaptain(teamId, requestedEmail) {
  if (!mongoose.isValidObjectId(teamId)) throw new Error('El equipo seleccionado no es válido.');

  const team = await Team.findById(teamId);
  if (!team) throw new Error('No existe ese equipo.');

  const nextEmail = String(requestedEmail || '').trim().toLowerCase();
  let nextCaptain = null;

  if (nextEmail) {
    nextCaptain = await User.findOne({ email: nextEmail, role: 'student' });
    if (!nextCaptain) throw new Error('Selecciona un estudiante con cuenta registrada.');

    const otherTeam = await Team.findOne({ capitanEmail: nextEmail, _id: { $ne: team._id } });
    if ((nextCaptain.teamName && nextCaptain.teamName !== team.nombre) || otherTeam) {
      throw new Error('Ese estudiante ya es capitán de otro equipo.');
    }
  }

  const previousEmail = team.capitanEmail;
  team.capitanEmail = nextEmail || null;
  await team.save();

  if (previousEmail && previousEmail !== nextEmail) {
    await User.updateOne(
      { email: previousEmail, teamName: team.nombre },
      { $set: { teamName: null } }
    );
  }

  if (nextCaptain) {
    await User.updateOne({ _id: nextCaptain._id }, { $set: { teamName: team.nombre } });
  }

  return team.toObject();
}

async function updateTeamStats(payload) {
  const { teamId, puntos, golesFavor, golesContra } = requirePayload(payload, 'Las estadísticas del equipo');
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
    grado: player.grado || '',
    posicion: player.posicion,
    fotoUrl: isManagedPlayerPhotoUrl(player.fotoUrl) ? player.fotoUrl : '',
    numero_camiseta: String(player.numero_camiseta ?? '0'),
    goles: player.goles || 0,
    equipo_nombre: player.equipo_id ? player.equipo_id.nombre : null
  }));
}

function getPrimaryTeamGrade(players) {
  const gradeCounts = new Map();
  players.forEach((player) => {
    const grade = String(player.grado || '').trim();
    if (grade) gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
  });

  let primaryGrade = '';
  let highestCount = 0;
  gradeCounts.forEach((count, grade) => {
    if (count > highestCount) {
      primaryGrade = grade;
      highestCount = count;
    }
  });

  return primaryGrade.replace(/(\d+)\s*\.?\s*(?:º|°)\s*(\d+)/g, '$1°$2');
}

function validatePlayerStatsBatch(updates) {
  if (!Array.isArray(updates) || updates.length === 0 || updates.length > 100) {
    throw new Error('Selecciona entre 1 y 100 jugadores para actualizar.');
  }

  const playerIds = new Set();
  return updates.map((update) => {
    if (!update || typeof update !== 'object' || Array.isArray(update)
      || !mongoose.isValidObjectId(update.id)) {
      throw new Error('Uno de los jugadores seleccionados no es válido.');
    }

    const playerId = String(update.id).toLowerCase();
    if (playerIds.has(playerId)) throw new Error('No repitas jugadores en la actualización.');
    playerIds.add(playerId);

    const isIntegerInput = (value) => (typeof value === 'number' && Number.isSafeInteger(value))
      || (typeof value === 'string' && /^\d+$/.test(value.trim()));
    if ((!isIntegerInput(update.numero_camiseta) && typeof update.numero_camiseta !== 'string')
      || !isIntegerInput(update.goles)) {
      throw new Error('Completa el número de camiseta y los goles de cada jugador.');
    }

    const shirtNumber = normalizeShirtNumber(update.numero_camiseta);
    const goalCount = Number(update.goles);
    if (!Number.isSafeInteger(goalCount) || goalCount < 0) {
      throw new Error('Los goles deben ser un número entero no negativo.');
    }

    return { id: playerId, numero_camiseta: shirtNumber, goles: goalCount };
  });
}

async function updatePlayerStatsBatch(updates) {
  const cleanUpdates = validatePlayerStatsBatch(updates);
  const playerIds = cleanUpdates.map((update) => update.id);
  const players = await Player.find({ _id: { $in: playerIds } });
  if (players.length !== cleanUpdates.length) throw new Error('No se encontró uno o más jugadores.');

  const playersById = new Map(players.map((player) => [player._id.toString(), player]));
  const teamId = players[0].equipo_id.toString();
  if (players.some((player) => player.equipo_id.toString() !== teamId)) {
    throw new Error('Solo puedes actualizar jugadores de un mismo equipo a la vez.');
  }

  await Player.bulkWrite(cleanUpdates.map((update) => ({
    updateOne: {
      filter: { _id: playersById.get(update.id)._id },
      update: { $set: { numero_camiseta: update.numero_camiseta, goles: update.goles } }
    }
  })));

  return { updated: cleanUpdates.length };
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

async function updatePlayerData(playerId, payload) {
  const { equipo_id, nombre, grado, numero_camiseta, posicion, goles, fotoUrl } = requirePayload(payload, 'Los datos del jugador');
  if (!mongoose.isValidObjectId(playerId) || !mongoose.isValidObjectId(equipo_id)) {
    throw new Error('Selecciona un equipo y un jugador válidos.');
  }

  const cleanName = String(nombre || '').trim();
  const cleanGrade = String(grado || '').trim();
  const shirtNumber = normalizeShirtNumber(numero_camiseta);
  const goalCount = Number(goles);

  if (!cleanName || !cleanGrade) throw new Error('El nombre completo y el grado o sección del jugador son obligatorios.');
  if (!Number.isInteger(goalCount) || goalCount < 0) {
    throw new Error('Los goles deben ser un número entero no negativo.');
  }
  if (fotoUrl !== undefined && fotoUrl !== '' && !isManagedPlayerPhotoUrl(fotoUrl)) {
    throw new Error('La foto del jugador debe cargarse como una imagen JPG, PNG o WebP.');
  }

  const [player, team] = await Promise.all([
    Player.findById(playerId),
    Team.findById(equipo_id)
  ]);

  if (!player || !team) throw new Error('No se encontró el jugador o el equipo seleccionado.');
  const previousPhotoUrl = player.fotoUrl;
  player.equipo_id = team._id;
  player.nombre = cleanName;
  player.grado = cleanGrade;
  player.numero_camiseta = shirtNumber;
  player.posicion = String(posicion || '').trim();
  player.goles = goalCount;
  if (fotoUrl !== undefined && fotoUrl !== '') player.fotoUrl = fotoUrl;
  await player.save();
  if (fotoUrl && previousPhotoUrl !== fotoUrl) await removePlayerPhoto(previousPhotoUrl).catch(() => {});

  return player.toObject();
}

async function listUsers() {
  const users = await User.find({}, 'nombre email role creado_en activo teamName')
    .sort({ creado_en: 1 })
    .lean();
  return users.map((user) => ({
    id: user._id.toString(),
    nombre: user.nombre,
    email: user.email,
    role: user.role,
    creado_en: user.creado_en,
    activo: user.activo !== false,
    teamName: user.teamName || null
  }));
}

async function resetUserPassword(userId, password) {
  if (!mongoose.isValidObjectId(userId)) throw new Error('El usuario seleccionado no es válido.');

  const cleanPassword = String(password || '');
  if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(cleanPassword)) {
    throw new Error('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.');
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10);
  const result = await User.updateOne(
    { _id: userId },
    { $set: { password: passwordHash } }
  );
  if (result.matchedCount === 0) throw new Error('No existe ese usuario.');
}

async function updateMatch(payload) {
  const { matchId, equipoLocalId, equipoVisitanteId, fechaPartido, horaPartido, cancha, estado } = requirePayload(payload, 'Los datos del partido');
  if (!mongoose.isValidObjectId(matchId) || !mongoose.isValidObjectId(equipoLocalId) || !mongoose.isValidObjectId(equipoVisitanteId)
    || !fechaPartido || !horaPartido || !String(cancha || '').trim()) {
    throw new Error('Completa los datos obligatorios y selecciona dos equipos válidos.');
  }
  if (String(equipoLocalId) === String(equipoVisitanteId)) {
    throw new Error('El equipo local y el visitante deben ser diferentes.');
  }

  if (!MATCH_STATUSES.includes(estado)) {
    throw new Error('El estado del partido no es válido.');
  }

  const match = await Match.findById(matchId);

  if (!match) {
    throw new Error('No existe ese partido.');
  }
  if (estado === 'Jugando' && match.estado !== 'Jugando') {
    throw new Error('Inicia el partido con el control «Iniciar en vivo».');
  }
  if (match.estado === 'Jugando'
    && (estado !== 'Jugando'
      || String(match.equipoLocalId) !== String(equipoLocalId)
      || String(match.equipoVisitanteId) !== String(equipoVisitanteId))) {
    throw new Error('Finaliza el partido en vivo con sus controles y conserva los equipos registrados.');
  }

  const local = await Team.findById(equipoLocalId);
  const visitante = await Team.findById(equipoVisitanteId);

  if (!local || !visitante) {
    throw new Error('Los equipos del partido no existen.');
  }
  if (normalizeSport(local.deporte) !== normalizeSport(visitante.deporte)) {
    throw new Error('Un partido debe enfrentar equipos del mismo deporte.');
  }
  if (local.categoria !== visitante.categoria) {
    throw new Error('Un partido debe enfrentar equipos de la misma categoría.');
  }

  match.equipoLocalId = local._id;
  match.equipoVisitanteId = visitante._id;
  match.deporte = normalizeSport(local.deporte);
  match.equipo_a = local.nombre;
  match.equipo_b = visitante.nombre;
  match.fecha = fechaPartido;
  match.hora = horaPartido;
  match.cancha = String(cancha).trim();
  match.estado = estado;
  try {
    await match.save();
  } catch (error) {
    throw matchLiveConflict(error);
  }

  return match.toObject();
}

async function startMatchLive(matchId) {
  if (!mongoose.isValidObjectId(matchId)) throw new Error('El partido seleccionado no es válido.');
  const match = await Match.findById(matchId);
  if (!match) throw new Error('No existe ese partido.');
  if (match.estado !== 'Por jugar') throw new Error('Solo se puede iniciar un partido que esté por jugar.');
  if (await Match.exists({ deporte: match.deporte, estado: 'Jugando' })) {
    throw new Error('Ya hay un partido en vivo para este deporte. Finalízalo antes de iniciar otro.');
  }

  try {
    const started = await Match.findOneAndUpdate(
      { _id: matchId, estado: 'Por jugar' },
      { $set: { estado: 'Jugando', resultado: null } },
      { new: true, runValidators: true }
    );
    if (!started) throw new Error('El partido ya no está disponible para iniciar.');
    return started.toObject();
  } catch (error) {
    throw matchLiveConflict(error);
  }
}

async function addMatchGoal({ matchId, side, playerId }) {
  if (!mongoose.isValidObjectId(matchId) || !mongoose.isValidObjectId(playerId)) {
    throw new Error('Selecciona un partido y un jugador válidos.');
  }
  if (!['local', 'visitante'].includes(side)) throw new Error('Selecciona un equipo válido para el gol.');

  const session = await mongoose.startSession();
  let updatedMatch;
  try {
    await session.withTransaction(async () => {
      const match = await Match.findOne({ _id: matchId, estado: 'Jugando' }).session(session);
      if (!match) throw new Error('Solo puedes registrar goles en un partido que esté en vivo.');
      const teamId = side === 'local' ? match.equipoLocalId : match.equipoVisitanteId;
      if (!teamId) throw new Error('El equipo seleccionado no está asociado correctamente al partido.');

      const player = await Player.findOne({ _id: playerId, equipo_id: teamId }).session(session);
      if (!player) throw new Error('El jugador seleccionado no pertenece al equipo elegido.');

      player.goles = (Number(player.goles) || 0) + 1;
      await player.save({ session });
      if (side === 'local') match.goles_a = (Number(match.goles_a) || 0) + 1;
      else match.goles_b = (Number(match.goles_b) || 0) + 1;
      await match.save({ session });
      updatedMatch = match.toObject();
    });
  } finally {
    await session.endSession();
  }
  return updatedMatch;
}

async function finishMatchLive(matchId) {
  if (!mongoose.isValidObjectId(matchId)) throw new Error('El partido seleccionado no es válido.');
  const session = await mongoose.startSession();
  let finishedMatch;
  try {
    await session.withTransaction(async () => {
      const match = await Match.findOne({ _id: matchId, estado: 'Jugando' }).session(session);
      if (!match) throw new Error('Solo puedes finalizar un partido que esté en vivo.');

      match.estado = 'Finalizado';
      match.resultado = `${match.equipo_a} ${match.goles_a} - ${match.goles_b} ${match.equipo_b}`;
      await match.save({ session });
      finishedMatch = match.toObject();
    });
  } finally {
    await session.endSession();
  }
  return finishedMatch;
}

async function deleteMatch(matchId) {
  if (await Match.exists({ _id: matchId, estado: 'Jugando' })) {
    throw new Error('Finaliza el partido en vivo antes de eliminarlo.');
  }
  const match = await Match.findByIdAndDelete(matchId);
  if (!match) throw new Error('No existe ese partido.');
  return match;
}

async function deletePlayer(playerId) {
  const player = await Player.findByIdAndDelete(playerId);
  if (!player) throw new Error('No existe ese jugador.');
  await removePlayerPhoto(player.fotoUrl).catch(() => {});
  return player;
}

module.exports = {
  MATCH_STATUSES,
  sanitizeAnnouncementHtml,
  getPopup,
  updatePopup,
  updateTeam,
  deleteTeam,
  listAdminTeams,
  updateTeamCaptain,
  updateTeamStats,
  listPlayers,
  getPrimaryTeamGrade,
  validatePlayerStatsBatch,
  updatePlayerStatsBatch,
  updatePlayerGoals,
  updatePlayerData,
  listUsers,
  resetUserPassword,
  updateMatch,
  startMatchLive,
  addMatchGoal,
  finishMatchLive,
  deleteMatch,
  deletePlayer
};
