const { createEquipo, addJugador, createPartido, actualizarResultadoPartido, listarPartidos } = require('../services/gestion.service');
const { listAdminTeams, MATCH_STATUSES, getPopup, updatePopup, listPlayers, listUsers, updateTeamStats, updateTeamCaptain, updateTeam, deleteTeam, updateMatch, updatePlayerGoals, updatePlayerData, deleteMatch, deletePlayer } = require('../services/admin.service');
const { listGalleryImages, saveGalleryImages, deleteGalleryImage, toggleGalleryImage } = require('../services/gallery.service');
const { saveAnnouncementImages, removeAnnouncementImage } = require('../services/announcement-image.service');
const tournamentService = require('../services/tournament.service');

async function dashboardData() {
  const [equipos, partidos, popup, jugadores, usuarios, posiciones, galleryImages] = await Promise.all([
    listAdminTeams(),
    listarPartidos(),
    getPopup(),
    listPlayers(),
    listUsers(),
    tournamentService.getStandings(),
    listGalleryImages()
  ]);

  const kpis = {
    equipos: equipos.length,
    partidosPendientes: partidos.filter((partido) => partido.estado !== 'Finalizado').length,
    goles: jugadores.reduce((total, jugador) => total + Number(jugador.goles || 0), 0),
    anunciosActivos: popup.activo ? 1 : 0
  };
  return { equipos, partidos, popup, jugadores, usuarios, posiciones, galleryImages, estadosPartido: MATCH_STATUSES, kpis };
}

async function renderDashboard(req, res, { error = null, success = null } = {}) {
  try {
    const data = await dashboardData();
    return res.render('admin/dashboard', {
      title: 'Panel administrador | Interclases LJV',
      user: req.session.user,
      error,
      success,
      ...data
    });
  } catch (loadError) {
    return res.status(500).render('admin/dashboard', {
      title: 'Panel administrador | Interclases LJV',
      user: req.session.user,
      equipos: [],
      partidos: [],
      popup: { titulo: '', mensaje: '', activo: 0 },
      jugadores: [],
      usuarios: [],
      posiciones: [],
      galleryImages: [],
      kpis: { equipos: 0, partidosPendientes: 0, goles: 0, anunciosActivos: 0 },
      estadosPartido: MATCH_STATUSES,
      error: loadError.message,
      success: null
    });
  }
}

function dashboard(req, res) {
  return renderDashboard(req, res, { error: req.query.error || null });
}

async function runDashboardAction(req, res, action, success) {
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
  'Partido eliminado correctamente.'
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
  'Equipo eliminado correctamente.'
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
  'Jugador eliminado de la plantilla.'
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
  'Imagen eliminada de la galería.'
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
  cambiarEstadoImagenGaleria
};
