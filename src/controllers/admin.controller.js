const { createEquipo, addJugador, createPartido, actualizarResultadoPartido, listarPartidos } = require('../services/gestion.service');
const { listAdminTeams, MATCH_STATUSES, getPopup, updatePopup, listPlayers, listUsers, updateTeamStats, updateTeamCaptain, updateTeam, deleteTeam, updateMatch, updatePlayerGoals, updatePlayerData, deleteMatch, deletePlayer } = require('../services/admin.service');
const { listGalleryImages, saveGalleryImages, deleteGalleryImage, toggleGalleryImage } = require('../services/gallery.service');
const { saveAnnouncementImages, removeAnnouncementImage } = require('../services/announcement-image.service');
const tournamentService = require('../services/tournament.service');
const TEAM_CATEGORIES = require('../constants/team-categories');
const { SPORTS } = require('../constants/sports');
const enrollmentService = require('../services/enrollment.service');

async function dashboardData() {
  const [equipos, partidos, popup, jugadores, usuarios, posiciones, galleryImages, enrollmentRequests, enrollmentConfig] = await Promise.all([
    listAdminTeams(),
    listarPartidos(),
    getPopup(),
    listPlayers(),
    listUsers(),
    tournamentService.getStandings(),
    listGalleryImages(),
    enrollmentService.listEnrollmentRequests(),
    enrollmentService.getEnrollmentConfig()
  ]);

  const kpis = {
    equipos: equipos.length,
    partidosPendientes: partidos.filter((partido) => partido.estado !== 'Finalizado').length,
    goles: jugadores.reduce((total, jugador) => total + Number(jugador.goles || 0), 0),
    anunciosActivos: popup.activo ? 1 : 0
  };
  return { equipos, partidos, popup, jugadores, usuarios, posiciones, galleryImages, enrollmentRequests, enrollmentConfig, sports: SPORTS, estadosPartido: MATCH_STATUSES, categoriasEquipo: TEAM_CATEGORIES, kpis };
}

async function renderDashboard(req, res, { error = null, success = null } = {}) {
  try {
    const data = await dashboardData();
    return res.render('admin/dashboard', {
      title: 'Panel administrador | Interclases Lucrecio Jaramillo',
      user: req.session.user,
      error,
      success,
      ...data
    });
  } catch (loadError) {
    return res.status(500).render('admin/dashboard', {
      title: 'Panel administrador | Interclases Lucrecio Jaramillo',
      user: req.session.user,
      equipos: [],
      partidos: [],
      popup: { titulo: '', mensaje: '', activo: 0 },
      jugadores: [],
      usuarios: [],
      posiciones: [],
      galleryImages: [],
      enrollmentRequests: [],
      enrollmentConfig: { inscripcionesAbiertas: false },
      sports: SPORTS,
      kpis: { equipos: 0, partidosPendientes: 0, goles: 0, anunciosActivos: 0 },
      estadosPartido: MATCH_STATUSES,
      categoriasEquipo: TEAM_CATEGORIES,
      error: loadError.message,
      success: null
    });
  }
}

function dashboard(req, res) {
  return renderDashboard(req, res, { error: req.query.error || null });
}

async function runDashboardAction(req, res, action, success, { requireBody = true } = {}) {
  if (requireBody && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ success: false, message: 'Cuerpo de la petición vacío.' });
  }

  try {
    const result = await action();
    const message = typeof success === 'function' ? success(result) : success;
    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ ok: true, message });
    }
    return renderDashboard(req, res, { success: message });
  } catch (error) {
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(422).json({ ok: false, message: error.message });
    }
    return renderDashboard(req, res, { error: error.message });
  }
}

const guardarPopup = (req, res) => runDashboardAction(
  req,
  res,
  async () => {
    const uploadedImages = req.files?.length ? await saveAnnouncementImages(req.files) : [];
    try {
      return await updatePopup({
        ...req.body,
        imagenes: uploadedImages.length ? uploadedImages : undefined,
        imagenUrl: uploadedImages[0] || req.body.imagenUrl
      });
    } catch (error) {
      await Promise.all(uploadedImages.map((url) => removeAnnouncementImage(url)));
      throw error;
    }
  },
  'Aviso publicado en la página principal.'
);

const guardarPartido = (req, res) => runDashboardAction(
  req,
  res,
  () => createPartido(req.body),
  'Partido creado correctamente.'
);

const editarPartido = (req, res) => runDashboardAction(
  req,
  res,
  () => updateMatch({ ...req.body, matchId: req.params.id }),
  'Partido actualizado correctamente.'
);

const eliminarPartido = (req, res) => runDashboardAction(
  req,
  res,
  () => deleteMatch(req.params.id),
  'Partido eliminado correctamente.',
  { requireBody: false }
);

const guardarResultado = (req, res) => runDashboardAction(
  req,
  res,
  () => actualizarResultadoPartido({
      partidoId: req.params.id,
      golesLocal: req.body.golesLocal,
      golesVisitante: req.body.golesVisitante
  }),
  (resultado) => `Resultado actualizado: ${resultado.resultado}`
);

const guardarEquipo = (req, res) => runDashboardAction(
  req,
  res,
  () => {
    const escudoUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : req.body.escudoUrl;
    return createEquipo({ ...req.body, escudoUrl });
  },
  'Equipo creado correctamente.'
);

const editarEquipo = (req, res) => runDashboardAction(
  req,
  res,
  () => {
    const escudoUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : req.body.escudoUrl;
    return updateTeam(req.params.id, { ...req.body, escudoUrl });
  },
  'Equipo actualizado correctamente.'
);

const eliminarEquipo = (req, res) => runDashboardAction(
  req,
  res,
  () => deleteTeam(req.params.id),
  'Equipo eliminado correctamente.',
  { requireBody: false }
);

const guardarEstadisticasEquipo = (req, res) => runDashboardAction(
  req,
  res,
  () => updateTeamStats({ ...req.body, teamId: req.params.id }),
  'Posición y estadísticas actualizadas.'
);

const actualizarCapitanEquipo = (req, res) => runDashboardAction(
  req,
  res,
  () => updateTeamCaptain(req.params.id, req.body.emailCapitan),
  'Capitán del equipo actualizado.'
);

const guardarJugador = (req, res) => runDashboardAction(
  req,
  res,
  () => addJugador(req.body),
  'Jugador agregado a la plantilla.'
);

const editarJugador = (req, res) => runDashboardAction(
  req,
  res,
  () => updatePlayerData(req.params.id, req.body),
  'Datos del jugador actualizados.'
);

const eliminarJugador = (req, res) => runDashboardAction(
  req,
  res,
  () => deletePlayer(req.params.id),
  'Jugador eliminado de la plantilla.',
  { requireBody: false }
);

const subirImagenGaleria = (req, res) => runDashboardAction(
  req,
  res,
  () => saveGalleryImages(req.files || [], req.body.titulo),
  (images) => `${images.length} ${images.length === 1 ? 'imagen añadida' : 'imágenes añadidas'} al carrusel.`
);

const eliminarImagenGaleria = (req, res) => runDashboardAction(
  req,
  res,
  () => deleteGalleryImage(req.params.id),
  'Imagen eliminada de la galería.',
  { requireBody: false }
);

const cambiarEstadoImagenGaleria = (req, res) => runDashboardAction(
  req,
  res,
  () => toggleGalleryImage(req.params.id, req.body.activo),
  (image) => `Foto ${image.activo ? 'activada' : 'oculta'} en el carrusel.`
);

const guardarGolesJugador = (req, res) => runDashboardAction(
  req,
  res,
  () => updatePlayerGoals(req.params.id, req.body.goles),
  'Goles del jugador actualizados.'
);

async function actualizarDisponibilidadInscripcion(req, res) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'Cuerpo de la petición vacío.' });
  }

  const requestedState = req.body.inscripcionesAbiertas;
  const opened = requestedState === true || requestedState === 'true';
  if (requestedState === undefined && req.is('application/json')) {
    return res.status(400).json({ success: false, message: 'Indica si las inscripciones deben abrirse o cerrarse.' });
  }
  if (requestedState !== undefined && requestedState !== false && requestedState !== 'false'
    && requestedState !== true && requestedState !== 'true') {
    return res.status(400).json({ success: false, message: 'El estado de las inscripciones no es válido.' });
  }

  try {
    const result = await enrollmentService.setEnrollmentAvailability(opened);
    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ success: true, inscripcionesAbiertas: result.inscripcionesAbiertas });
    }
    return renderDashboard(req, res, { success: 'Estado de inscripciones actualizado.' });
  } catch (error) {
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(422).json({ success: false, message: error.message });
    }
    return renderDashboard(req, res, { error: error.message });
  }
}

const aprobarInscripcion = (req, res) => runDashboardAction(
  req,
  res,
  () => enrollmentService.approveEnrollment(req.params.id),
  (team) => `Solicitud aprobada. Se creó el equipo ${team.nombre} y su plantilla.`,
  { requireBody: false }
);

const rechazarInscripcion = (req, res) => runDashboardAction(
  req,
  res,
  () => enrollmentService.rejectEnrollment(req.params.id),
  'Solicitud rechazada.',
  { requireBody: false }
);

const eliminarSolicitudInscripcion = (req, res) => runDashboardAction(
  req,
  res,
  () => enrollmentService.deleteEnrollmentRequest(req.params.id),
  'Solicitud eliminada.',
  { requireBody: false }
);

module.exports = {
  dashboard,
  guardarPopup,
  guardarPartido,
  editarPartido,
  eliminarPartido,
  guardarResultado,
  guardarEquipo,
  editarEquipo,
  eliminarEquipo,
  guardarEstadisticasEquipo,
  actualizarCapitanEquipo,
  guardarJugador,
  editarJugador,
  guardarGolesJugador,
  eliminarJugador,
  subirImagenGaleria,
  eliminarImagenGaleria,
  cambiarEstadoImagenGaleria,
  actualizarDisponibilidadInscripcion,
  aprobarInscripcion,
  rechazarInscripcion,
  eliminarSolicitudInscripcion
};
