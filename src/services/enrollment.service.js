const mongoose = require('mongoose');
const EnrollmentRequest = require('../models/EnrollmentRequest');
const EnrollmentSetting = require('../models/EnrollmentSetting');
const TournamentConfig = require('../models/TournamentConfig');
const Team = require('../models/Team');
const Player = require('../models/Player');
const TEAM_CATEGORIES = require('../constants/team-categories');
const { SPORTS, SPORT_IDS } = require('../constants/sports');

const MAX_ROSTER_SIZE = 30;
const NAME_PATTERN = /^[\p{L}\p{M}\p{N} .,'’&()-]+$/u;
const DEFAULT_ENABLED_SPORTS = Object.freeze({
  futbol: true,
  baloncesto: true,
  voleibol: true
});

function cleanText(value, maxLength, label) {
  const clean = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!clean || clean.length > maxLength || !NAME_PATTERN.test(clean)) {
    throw new Error(`${label} es obligatorio y debe tener máximo ${maxLength} caracteres válidos.`);
  }
  return clean;
}

function normalizeRoster(payload) {
  if (Array.isArray(payload.jugadores)) return payload.jugadores;
  const names = Array.isArray(payload.jugadorNombre) ? payload.jugadorNombre : [payload.jugadorNombre];
  const numbers = Array.isArray(payload.jugadorNumero) ? payload.jugadorNumero : [payload.jugadorNumero];
  return names.map((nombre, index) => ({ nombre, numero_camiseta: numbers[index] }));
}

function validateEnrollmentPayload(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Los datos de la inscripción no se recibieron correctamente.');
  }
  const deporte = String(payload.deporte || '').trim().toLowerCase();
  if (!SPORT_IDS.includes(deporte)) throw new Error('Selecciona un deporte disponible.');
  const nombreEquipo = cleanText(payload.nombreEquipo, 80, 'El nombre del equipo');
  const categoria = String(payload.categoria || '').trim();
  if (!TEAM_CATEGORIES.includes(categoria)) throw new Error('Selecciona una categoría válida.');
  const grado = cleanText(payload.grado, 40, 'El grado o sección');
  const responsable = cleanText(payload.responsable, 100, 'El nombre de la persona responsable');
  const contacto = String(payload.contacto || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const emailContact = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contacto) && contacto.length <= 120;
  const phoneDigits = contacto.replace(/[+\s().-]/g, '');
  const phoneContact = /^\+?[\d\s().-]+$/.test(contacto) && /^\+?\d{7,15}$/.test(phoneDigits);
  if (!emailContact && !phoneContact) {
    throw new Error('Ingresa un correo válido o un teléfono de 7 a 15 dígitos.');
  }

  const roster = normalizeRoster(payload);
  if (roster.length < 1 || roster.length > MAX_ROSTER_SIZE) {
    throw new Error(`La plantilla debe incluir entre 1 y ${MAX_ROSTER_SIZE} jugadores.`);
  }
  const seenNumbers = new Set();
  const jugadores = roster.map((player) => {
    const nombre = cleanText(player?.nombre, 80, 'El nombre de cada jugador');
    const numero_camiseta = Number(player?.numero_camiseta ?? player?.numero);
    if (!Number.isInteger(numero_camiseta) || numero_camiseta < 1 || numero_camiseta > 99) {
      throw new Error('Cada número de camiseta debe ser un entero entre 1 y 99.');
    }
    if (seenNumbers.has(numero_camiseta)) throw new Error('No se pueden repetir números de camiseta en la plantilla.');
    seenNumbers.add(numero_camiseta);
    return { nombre, numero_camiseta };
  });

  return { deporte, nombreEquipo, categoria, grado, responsable, contacto, jugadores };
}

function mapEnrollmentToTeamAndPlayers(request, teamId) {
  return {
    team: {
      nombre: request.nombreEquipo,
      categoria: request.categoria,
      deporte: request.deporte,
      capitanEmail: null
    },
    players: request.jugadores.map((player) => ({
      equipo_id: teamId,
      nombre: player.nombre,
      grado: request.grado,
      numero_camiseta: player.numero_camiseta,
      goles: 0
    }))
  };
}

function assertEnrollmentOpen(sport, setting) {
  if (!setting?.abierto) throw new Error('Las inscripciones para este deporte están cerradas.');
  if (setting.deporte !== sport) throw new Error('La disponibilidad seleccionada no corresponde al deporte.');
}

async function getEnrollmentConfig() {
  const config = await TournamentConfig.findById('global').lean();
  if (config) {
    return {
      inscripcionesAbiertas: config.inscripcionesAbiertas === true,
      deportesHabilitados: { ...DEFAULT_ENABLED_SPORTS, ...config.deportesHabilitados }
    };
  }

  const legacySettings = await EnrollmentSetting.find({}).lean();
  return {
    inscripcionesAbiertas: legacySettings.some((setting) => setting.abierto === true),
    deportesHabilitados: { ...DEFAULT_ENABLED_SPORTS }
  };
}

async function getActiveSports() {
  const config = await getEnrollmentConfig();
  if (!config.inscripcionesAbiertas) return [];
  return SPORTS.filter((sport) => config.deportesHabilitados[sport.id]);
}

async function submitEnrollment(payload) {
  const request = validateEnrollmentPayload(payload);
  const config = await getEnrollmentConfig();
  const setting = {
    deporte: request.deporte,
    abierto: config.inscripcionesAbiertas && config.deportesHabilitados[request.deporte]
  };
  assertEnrollmentOpen(request.deporte, setting);
  const existingTeam = await Team.findOne({
    nombre: new RegExp(`^${request.nombreEquipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  }).lean();
  if (existingTeam) throw new Error('Ya existe un equipo con ese nombre.');
  const duplicateRequest = await EnrollmentRequest.exists({
    deporte: request.deporte,
    nombreEquipo: new RegExp(`^${request.nombreEquipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    estado: { $in: ['pendiente', 'procesando', 'aprobada'] }
  });
  if (duplicateRequest) throw new Error('Ya existe una solicitud con ese nombre de equipo.');
  return EnrollmentRequest.create(request);
}

async function listEnrollmentRequests() {
  return EnrollmentRequest.find({ categoria: { $in: TEAM_CATEGORIES } }).sort({ creado_en: -1 }).lean();
}

async function setEnrollmentAvailability(opened) {
  if (typeof opened !== 'boolean') throw new Error('El estado de las inscripciones no es válido.');
  const updated = await TournamentConfig.findOneAndUpdate(
    { _id: 'global' },
    {
      $set: { inscripcionesAbiertas: opened },
      $setOnInsert: { deportesHabilitados: DEFAULT_ENABLED_SPORTS }
    },
    { upsert: true, new: true, runValidators: true }
  ).lean();
  return { inscripcionesAbiertas: updated.inscripcionesAbiertas };
}

async function approveEnrollment(requestId) {
  if (!mongoose.isValidObjectId(requestId)) throw new Error('La solicitud seleccionada no es válida.');
  const session = await mongoose.startSession();
  let approvedTeam;
  try {
    await session.withTransaction(async () => {
      const request = await EnrollmentRequest.findOneAndUpdate(
        { _id: requestId, estado: 'pendiente' },
        { $set: { estado: 'procesando' } },
        { new: true, session }
      );
      if (!request) throw new Error('La solicitud no existe o ya fue atendida.');

      const escapedName = request.nombreEquipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const duplicate = await Team.findOne({ nombre: new RegExp(`^${escapedName}$`, 'i') }).session(session).lean();
      if (duplicate) throw new Error('Ya existe un equipo con ese nombre; no se puede aprobar la solicitud.');
      const team = new Team({
        nombre: request.nombreEquipo,
        categoria: request.categoria,
        deporte: request.deporte,
        capitanEmail: null
      });
      await team.save({ session });
      const { players } = mapEnrollmentToTeamAndPlayers(request, team._id);
      await Player.insertMany(players, { ordered: true, session });
      request.estado = 'aprobada';
      request.equipoCreadoId = team._id;
      await request.save({ session });
      approvedTeam = { id: team._id.toString(), nombre: team.nombre };
    });
    return approvedTeam;
  } catch (error) {
    if (error.code === 11000) throw new Error('Ya existe un equipo con ese nombre; no se puede aprobar la solicitud.');
    throw error;
  } finally {
    await session.endSession();
  }
}

async function rejectEnrollment(requestId) {
  if (!mongoose.isValidObjectId(requestId)) throw new Error('La solicitud seleccionada no es válida.');
  const request = await EnrollmentRequest.findOneAndUpdate(
    { _id: requestId, estado: 'pendiente' },
    { $set: { estado: 'rechazada' } },
    { new: true }
  );
  if (!request) throw new Error('La solicitud no existe o ya fue atendida.');
  return request;
}

async function deleteEnrollmentRequest(requestId) {
  if (!mongoose.isValidObjectId(requestId)) throw new Error('La solicitud seleccionada no es válida.');
  const request = await EnrollmentRequest.findOneAndDelete({ _id: requestId, estado: { $ne: 'procesando' } });
  if (!request) throw new Error('No existe esa solicitud.');
  return request;
}

module.exports = {
  MAX_ROSTER_SIZE,
  validateEnrollmentPayload,
  mapEnrollmentToTeamAndPlayers,
  assertEnrollmentOpen,
  getEnrollmentConfig,
  getActiveSports,
  submitEnrollment,
  listEnrollmentRequests,
  setEnrollmentAvailability,
  approveEnrollment,
  rejectEnrollment,
  deleteEnrollmentRequest
};
