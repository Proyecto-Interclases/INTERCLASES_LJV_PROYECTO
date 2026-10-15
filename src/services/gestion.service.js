const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const User = require('../models/User');
const mongoose = require('mongoose');
const TEAM_CATEGORIES = require('../constants/team-categories');
const { normalizeSport, SPORT_IDS } = require('../constants/sports');

const MATCH_STATUSES = ['Por jugar', 'Jugando', 'Finalizado'];

function exactCaseInsensitive(value) {
  return new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function createEquipo({ nombre, categoria, emailCapitan, escudoUrl, deporte = 'futbol' }) {
  const trimmedNombre = String(nombre || '').trim();
  const trimmedCategoria = String(categoria || '').trim();
  const captainEmail = String(emailCapitan || '').trim().toLowerCase();
  const sport = String(deporte || 'futbol').trim().toLowerCase();

  if (!trimmedNombre || !trimmedCategoria) {
    throw new Error('El nombre y la categoría del equipo son obligatorios.');
  }
  if (!TEAM_CATEGORIES.includes(trimmedCategoria)) {
    throw new Error(`La categoría debe ser una de estas opciones: ${TEAM_CATEGORIES.join(', ')}.`);
  }
  if (!SPORT_IDS.includes(sport)) throw new Error('Selecciona un deporte válido.');

  let captain = null;
  if (captainEmail) {
    captain = await User.findOne({ email: captainEmail, role: 'student' });
    if (!captain) throw new Error('El capitán debe ser un estudiante con cuenta registrada.');
    if (captain.teamName && captain.teamName !== trimmedNombre) {
      throw new Error('Ese estudiante ya está asignado a otro equipo.');
    }
    const teamWithCaptain = await Team.findOne({ capitanEmail: captainEmail });
    if (teamWithCaptain && teamWithCaptain.nombre !== trimmedNombre) {
      throw new Error('Ese estudiante ya es capitán de otro equipo.');
    }
  }

  const existing = await Team.findOne({ nombre: exactCaseInsensitive(trimmedNombre) });

  if (existing) {
    const scope = existing.categoria === trimmedCategoria ? 'en esta categoría' : 'en el torneo';
    throw new Error(`Ya existe un equipo con ese nombre ${scope}.`);
  }

  let equipo;
  try {
    equipo = await Team.create({
      nombre: trimmedNombre,
      categoria: trimmedCategoria,
      deporte: sport,
      escudoUrl: String(escudoUrl || '').trim(),
      capitanEmail: captainEmail || null
    });
  } catch (error) {
    if (error.code === 11000) throw new Error('Ya existe un equipo con ese nombre en el torneo.');
    throw error;
  }

  if (captain) {
    await User.updateOne({ _id: captain._id }, { $set: { teamName: trimmedNombre } });
  }

  return {
    id: equipo._id.toString(),
    nombre: equipo.nombre,
    categoria: equipo.categoria
  };
}

async function addJugador({ equipoId, equipo_id, nombre, grado, numero_camiseta, numeroCamiseta, posicion, goles = 0 }) {
  const teamId = equipoId || equipo_id;
  const trimmedNombre = String(nombre || '').trim();
  const trimmedGrade = String(grado || '').trim();
  const trimmedPosicion = String(posicion || '').trim();
  const shirtNumber = Number(numero_camiseta ?? numeroCamiseta ?? 0);
  const goalCount = Number(goles);

  if (!mongoose.isValidObjectId(teamId) || !trimmedNombre || !trimmedGrade) {
    throw new Error('Selecciona un equipo e ingresa el nombre completo y el grado o sección del jugador.');
  }
  if (!Number.isInteger(shirtNumber) || shirtNumber < 0 || shirtNumber > 99 || !Number.isInteger(goalCount) || goalCount < 0) {
    throw new Error('El número de camiseta debe estar entre 0 y 99 y los goles deben ser un entero no negativo.');
  }

  const equipo = await Team.findById(teamId);

  if (!equipo) {
    throw new Error('No existe ese equipo.');
  }
  if (await Player.exists({ equipo_id: equipo._id, numero_camiseta: shirtNumber })) {
    throw new Error('Ese número de camiseta ya está asignado en el equipo.');
  }

  const jugador = await Player.create({
    equipo_id: equipo._id,
    nombre: trimmedNombre,
    grado: trimmedGrade,
    posicion: trimmedPosicion,
    numero_camiseta: shirtNumber,
    goles: goalCount
  });

  return {
    id: jugador._id.toString(),
    equipoId: jugador.equipo_id.toString(),
    nombre: jugador.nombre,
    grado: jugador.grado,
    posicion: jugador.posicion,
    numero_camiseta: jugador.numero_camiseta,
    goles: jugador.goles
  };
}

async function createPartido({ equipoLocalId, equipoVisitanteId, fechaPartido, horaPartido, cancha, estado = 'Por jugar' }) {
  if (!mongoose.isValidObjectId(equipoLocalId) || !mongoose.isValidObjectId(equipoVisitanteId) || !fechaPartido || !horaPartido || !String(cancha || '').trim()) {
    throw new Error('Completa los datos obligatorios y selecciona dos equipos válidos.');
  }
  if (String(equipoLocalId) === String(equipoVisitanteId)) {
    throw new Error('El equipo local y el visitante deben ser diferentes.');
  }
  if (!MATCH_STATUSES.includes(estado)) {
    throw new Error('El estado del partido no es válido.');
  }

  const local = await Team.findById(equipoLocalId);
  const visitante = await Team.findById(equipoVisitanteId);

  if (!local || !visitante) {
    throw new Error('Los equipos del partido no existen.');
  }
  if (normalizeSport(local.deporte) !== normalizeSport(visitante.deporte)) {
    throw new Error('Un partido debe enfrentar equipos del mismo deporte.');
  }

  const partido = await Match.create({
    equipoLocalId: local._id,
    equipoVisitanteId: visitante._id,
    deporte: normalizeSport(local.deporte),
    equipo_a: local.nombre,
    equipo_b: visitante.nombre,
    fecha: fechaPartido,
    hora: horaPartido,
    cancha: String(cancha).trim(),
    estado,
    goles_a: 0,
    goles_b: 0
  });

  return {
    id: partido._id.toString(),
    equipoLocalId: local._id.toString(),
    equipoVisitanteId: visitante._id.toString(),
    fechaPartido: partido.fecha,
    horaPartido: partido.hora,
    cancha: partido.cancha,
    estado: partido.estado
  };
}

async function actualizarResultadoPartido({ partidoId, golesLocal, golesVisitante }) {
  const homeScore = Number(golesLocal);
  const awayScore = Number(golesVisitante);
  if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    throw new Error('Los marcadores deben ser números enteros no negativos.');
  }

  const partido = await Match.findById(partidoId);

  if (!partido) {
    throw new Error('No existe ese partido.');
  }

  const resultado = `${partido.equipo_a} ${homeScore} - ${awayScore} ${partido.equipo_b}`;

  partido.goles_a = homeScore;
  partido.goles_b = awayScore;
  partido.estado = 'Finalizado';
  partido.resultado = resultado;
  await partido.save();

  return { id: partido._id.toString(), resultado };
}

async function listarPartidos() {
  const partidos = await Match.find({}).sort({ fecha: 1, hora: 1 }).lean();

  return partidos.map((partido) => ({
    id: partido._id.toString(),
    equipo_local_id: partido.equipoLocalId ? partido.equipoLocalId.toString() : null,
    equipo_visitante_id: partido.equipoVisitanteId ? partido.equipoVisitanteId.toString() : null,
    deporte: normalizeSport(partido.deporte),
    equipo_local: partido.equipo_a,
    equipo_visitante: partido.equipo_b,
    fecha_partido: partido.fecha,
    hora_partido: partido.hora,
    cancha: partido.cancha,
    estado: ['Pendiente', 'Programado'].includes(partido.estado)
      ? 'Por jugar'
      : ['En Vivo', 'En vivo'].includes(partido.estado)
        ? 'Jugando'
        : partido.estado || 'Por jugar',
    goles_local: partido.goles_a ?? partido.goles_local ?? 0,
    goles_visitante: partido.goles_b ?? partido.goles_visitante ?? 0,
    resultado: partido.resultado || `${partido.equipo_a} ${partido.goles_a ?? partido.goles_local ?? 0} - ${partido.goles_b ?? partido.goles_visitante ?? 0} ${partido.equipo_b}`
  }));
}

module.exports = {
  createEquipo,
  addJugador,
  createPartido,
  actualizarResultadoPartido,
  listarPartidos
};
