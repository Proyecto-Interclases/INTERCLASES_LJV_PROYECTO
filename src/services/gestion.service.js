const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const User = require('../models/User');

const MATCH_STATUSES = ['Por jugar', 'Jugando', 'Finalizado'];

async function createEquipo({ nombre, categoria, emailCapitan, escudoUrl }) {
  const trimmedNombre = String(nombre || '').trim();
  const trimmedCategoria = String(categoria || '').trim();

  if (!trimmedNombre || !trimmedCategoria) {
    throw new Error('El nombre y la categoría del equipo son obligatorios.');
  }

  const existing = await Team.findOne({ nombre: trimmedNombre });

  if (existing) {
    return {
      id: existing._id.toString(),
      nombre: existing.nombre,
      categoria: existing.categoria
    };
  }

  const equipo = await Team.create({
    nombre: trimmedNombre,
    categoria: trimmedCategoria,
    escudoUrl: String(escudoUrl || '').trim(),
    capitanEmail: emailCapitan ? String(emailCapitan).trim().toLowerCase() : null
  });

  if (emailCapitan) {
    await User.updateOne({ email: String(emailCapitan).trim().toLowerCase() }, { $set: { teamName: trimmedNombre } });
  }

  return {
    id: equipo._id.toString(),
    nombre: equipo.nombre,
    categoria: equipo.categoria
  };
}

async function addJugador({ equipoId, equipo_id, nombre, numero_camiseta, numeroCamiseta, posicion, goles = 0 }) {
  const teamId = equipoId || equipo_id;
  const trimmedNombre = String(nombre || '').trim();
  const trimmedPosicion = String(posicion || '').trim() || 'Sin definir';
  const shirtNumber = Number(numero_camiseta ?? numeroCamiseta ?? 0);
  const goalCount = Number(goles);

  if (!teamId || !trimmedNombre) {
    throw new Error('Selecciona un equipo e ingresa el nombre del jugador.');
  }
  if (!Number.isInteger(shirtNumber) || shirtNumber < 0 || shirtNumber > 99 || !Number.isInteger(goalCount) || goalCount < 0) {
    throw new Error('El número de camiseta debe estar entre 0 y 99 y los goles deben ser un entero no negativo.');
  }

  const equipo = await Team.findById(teamId);

  if (!equipo) {
    throw new Error('No existe ese equipo.');
  }

  const jugador = await Player.create({
    equipo_id: equipo._id,
    nombre: trimmedNombre,
    posicion: trimmedPosicion,
    numero_camiseta: shirtNumber,
    goles: goalCount
  });

  return {
    id: jugador._id.toString(),
    equipoId: jugador.equipo_id.toString(),
    nombre: jugador.nombre,
    posicion: jugador.posicion,
    numero_camiseta: jugador.numero_camiseta,
    goles: jugador.goles
  };
}

async function createPartido({ equipoLocalId, equipoVisitanteId, fechaPartido, horaPartido, cancha, estado = 'Por jugar' }) {
  if (!equipoLocalId || !equipoVisitanteId || equipoLocalId === equipoVisitanteId || !fechaPartido || !horaPartido || !cancha) {
    throw new Error('Faltan datos para crear el partido.');
  }
  if (!MATCH_STATUSES.includes(estado)) {
    throw new Error('El estado del partido no es válido.');
  }

  const local = await Team.findById(equipoLocalId);
  const visitante = await Team.findById(equipoVisitanteId);

  if (!local || !visitante) {
    throw new Error('Los equipos del partido no existen.');
  }

  const partido = await Match.create({
    equipoLocalId: local._id,
    equipoVisitanteId: visitante._id,
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
