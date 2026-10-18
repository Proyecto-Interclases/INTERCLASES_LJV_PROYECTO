const { createEquipo, addJugador, createPartido, actualizarResultadoPartido, listarPartidos } = require('../services/gestion.service');
const { listAdminTeams, MATCH_STATUSES, getPopup, updatePopup, listPlayers, getPrimaryTeamGrade, updatePlayerStatsBatch, listUsers, resetUserPassword, updateTeamStats, updateTeamCaptain, updateTeam, deleteTeam, updateMatch, updatePlayerGoals, updatePlayerData, deleteMatch, deletePlayer } = require('../services/admin.service');
const { listGalleryImages, saveGalleryImages, deleteGalleryImage, toggleGalleryImage } = require('../services/gallery.service');
const { saveAnnouncementImages, removeAnnouncementImage } = require('../services/announcement-image.service');
const tournamentService = require('../services/tournament.service');
const TEAM_CATEGORIES = require('../constants/team-categories');
const { SPORTS, SPORT_IDS } = require('../constants/sports');
const enrollmentService = require('../services/enrollment.service');
const { savePlayerPhoto, removePlayerPhoto } = require('../services/player-photo.service');

function normalizeCategoryFilter(value) {
  const category = String(value || '').trim();
  return ['', 'all', 'todas'].includes(category.toLocaleLowerCase('es')) ? '' : category;
}

function buildAdminStandings(standingsGroups, sport) {
  return standingsGroups.flatMap((group) => {
    const ranksByCategory = new Map();
    return group.map((team) => {
      const category = team.category || team.categoria || '';
      const rank = (ranksByCategory.get(category) || 0) + 1;
      ranksByCategory.set(category, rank);
      return { ...team, deporte: sport, category, rank };
    });
  });
}

async function dashboardData(order = 'desc') {
  const standingsGroups = SPORTS.flatMap((sport) => TEAM_CATEGORIES.map((categoria) => ({ sport: sport.id, categoria })));
  const [equipos, partidos, popup, jugadores, usuarios, posicionesPorGrupo, galleryImages, enrollmentRequests, enrollmentConfig] = await Promise.all([
    listAdminTeams(order),
    listarPartidos(),
    getPopup(),
    listPlayers(),
    listUsers(),
    Promise.all(standingsGroups.map(({ sport, categoria }) => tournamentService.getStandings(categoria, sport))),
    listGalleryImages(),
    enrollmentService.listEnrollmentRequests(),
    enrollmentService.getEnrollmentConfig()
  ]);
  const activeTeamIds = new Set(equipos.map((equipo) => equipo.id));
  const jugadoresActivos = jugadores.filter((jugador) => activeTeamIds.has(jugador.equipo_id));
  const posiciones = posicionesPorGrupo.flatMap((group, groupIndex) => {
    const { sport, categoria } = standingsGroups[groupIndex];
    return group.map((team, index) => ({ ...team, deporte: sport, category: categoria, rank: index + 1 }));
  });
  const playersByTeam = new Map();
  jugadoresActivos.forEach((jugador) => {
    if (!jugador.equipo_id) return;
    if (!playersByTeam.has(jugador.equipo_id)) playersByTeam.set(jugador.equipo_id, []);
    playersByTeam.get(jugador.equipo_id).push(jugador);
  });
  const equiposConGrado = equipos.map((equipo) => ({
    ...equipo,
    gradoPrincipal: getPrimaryTeamGrade(playersByTeam.get(equipo.id) || [])
  }));
  const teamById = new Map(equipos.map((team) => [team.id, team]));
  const teamByName = new Map(equipos.map((team) => [team.nombre, team]));
  const partidosConCategoria = partidos.flatMap((partido) => {
    const homeTeam = teamById.get(partido.equipo_local_id) || teamByName.get(partido.equipo_local);
    const awayTeam = teamById.get(partido.equipo_visitante_id) || teamByName.get(partido.equipo_visitante);
    if (!homeTeam || !awayTeam) return [];
    return {
      ...partido,
      equipo_local_escudoUrl: homeTeam.escudoUrl || '',
      equipo_visitante_escudoUrl: awayTeam.escudoUrl || '',
      equipo_local_grado: getPrimaryTeamGrade(playersByTeam.get(homeTeam.id) || []),
      equipo_visitante_grado: getPrimaryTeamGrade(playersByTeam.get(awayTeam.id) || []),
      categoria: homeTeam?.categoria || awayTeam?.categoria || ''
    };
  });
  const kpis = {
    equipos: equipos.length,
    partidosPendientes: partidosConCategoria.filter((partido) => partido.estado !== 'Finalizado').length,
    goles: jugadoresActivos.reduce((total, jugador) => total + Number(jugador.goles || 0), 0),
    anunciosActivos: popup.activo ? 1 : 0
  };
  return { equipos: equiposConGrado, partidos: partidosConCategoria, popup, jugadores: jugadoresActivos, usuarios, posiciones, galleryImages, enrollmentRequests, enrollmentConfig, sports: SPORTS, estadosPartido: MATCH_STATUSES, categoriasEquipo: TEAM_CATEGORIES, kpis };
}

async function renderDashboard(req, res, { error = null, success = null } = {}) {
  try {
    const selectedOrder = req.query.orden === 'asc' ? 'asc' : 'desc';
    const data = await dashboardData(selectedOrder);
    return res.render('admin/dashboard', {
      title: 'Panel administrador | Interclases Lucrecio Jaramillo',
      user: req.session.user,
      error,
      success,
      selectedOrder,
      selectedSport: SPORT_IDS.includes(req.query.deporte) ? req.query.deporte : 'futbol',
      selectedCategory: TEAM_CATEGORIES.includes(req.query.categoria) ? req.query.categoria : '',
      ...data
    });
  } catch (loadError) {
    return res.status(500).render('admin/dashboard', {
      title: 'Panel administrador | Interclases Lucrecio Jaramillo',
      user: req.session.user,
      selectedOrder: req.query.orden === 'asc' ? 'asc' : 'desc',
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
      selectedSport: SPORT_IDS.includes(req.query.deporte) ? req.query.deporte : 'futbol',
      selectedCategory: TEAM_CATEGORIES.includes(req.query.categoria) ? req.query.categoria : '',
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

async function restablecerContrasenaUsuario(req, res) {
  try {
    await resetUserPassword(req.params.id, req.body?.password);
    return res.json({ ok: true, message: 'La contraseña se restableció correctamente.' });
  } catch (error) {
    return res.status(422).json({ ok: false, message: error.message });
  }
}

async function adminOverview(req, res) {
  const sport = String(req.query.deporte || 'futbol').trim().toLowerCase();
  const category = normalizeCategoryFilter(req.query.categoria);
  if (sport && !SPORT_IDS.includes(sport)) {
    return res.status(400).json({ ok: false, message: 'El deporte seleccionado no es válido.' });
  }
  if (category && !TEAM_CATEGORIES.includes(category)) {
    return res.status(400).json({ ok: false, message: 'La categoría seleccionada no es válida.' });
  }

  try {
    const [allTeams, allMatches, allPlayers, standingsGroups] = await Promise.all([
      listAdminTeams(),
      listarPartidos(),
      listPlayers(),
      Promise.all(TEAM_CATEGORIES.map((entry) => tournamentService.getStandings(entry, sport)))
    ]);
    const equipos = allTeams.filter((team) => team.deporte === sport
      && (!category || team.categoria === category));
    const teamIds = new Set(equipos.map((team) => team.id));
    const players = allPlayers.filter((player) => teamIds.has(player.equipo_id));
    const playersByTeam = new Map();
    players.forEach((player) => {
      if (!playersByTeam.has(player.equipo_id)) playersByTeam.set(player.equipo_id, []);
      playersByTeam.get(player.equipo_id).push(player);
    });
    const teamById = new Map(allTeams.map((team) => [team.id, team]));
    const teamByName = new Map(allTeams.map((team) => [team.nombre, team]));
    const partidos = allMatches.filter((match) => {
      const home = teamById.get(match.equipo_local_id) || teamByName.get(match.equipo_local);
      const away = teamById.get(match.equipo_visitante_id) || teamByName.get(match.equipo_visitante);
      return match.deporte === sport && home && away
        && (!category || (home.categoria === category && away.categoria === category));
    }).map((match) => {
      const home = teamById.get(match.equipo_local_id) || teamByName.get(match.equipo_local);
      const away = teamById.get(match.equipo_visitante_id) || teamByName.get(match.equipo_visitante);
      return {
        ...match,
        equipo_local_escudoUrl: home.escudoUrl || '',
        equipo_visitante_escudoUrl: away.escudoUrl || '',
        equipo_local_grado: getPrimaryTeamGrade(playersByTeam.get(home.id) || []),
        equipo_visitante_grado: getPrimaryTeamGrade(playersByTeam.get(away.id) || []),
        categoria: home?.categoria || away?.categoria || ''
      };
    });
    const posiciones = buildAdminStandings(standingsGroups, sport);
    const goals = players.reduce((total, player) => total + Number(player.goles || 0), 0);
    return res.json({
      ok: true,
      filtros: { deporte: sport, categoria: category || 'todas' },
      equipos: equipos.map((team) => ({
        ...team,
        jugadores: playersByTeam.get(team.id) || [],
        gradoPrincipal: getPrimaryTeamGrade(playersByTeam.get(team.id) || [])
      })),
      jugadores: players,
      partidos,
      posiciones,
      resumen: {
        equipos: equipos.length,
        partidosPendientes: partidos.filter((match) => match.estado !== 'Finalizado').length,
        goles: goals
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'No fue posible cargar el resumen administrativo.' });
  }
}

async function runDashboardAction(req, res, action, success, { requireBody = true } = {}) {
  if (requireBody && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0)) {
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

async function withUploadedPlayerPhoto(req, action) {
  const fotoUrl = req.file ? await savePlayerPhoto(req.file) : '';
  try {
    const payload = { ...req.body };
    delete payload.fotoUrl;
    if (fotoUrl) payload.fotoUrl = fotoUrl;
    return await action(payload);
  } catch (error) {
    if (fotoUrl) await removePlayerPhoto(fotoUrl).catch(() => {});
    throw error;
  }
}

const guardarJugador = (req, res) => runDashboardAction(
  req,
  res,
  () => withUploadedPlayerPhoto(req, (payload) => addJugador(payload)),
  'Jugador agregado a la plantilla.'
);

const editarJugador = (req, res) => runDashboardAction(
  req,
  res,
  () => withUploadedPlayerPhoto(req, (payload) => updatePlayerData(req.params.id, payload)),
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

async function guardarEstadisticasJugadores(req, res) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ ok: false, message: 'Los datos de la actualización no son válidos.' });
  }

  try {
    const result = await updatePlayerStatsBatch(req.body.jugadores);
    return res.json({
      ok: true,
      message: `Se actualizaron ${result.updated} ${result.updated === 1 ? 'jugador' : 'jugadores'}.`,
      updated: result.updated
    });
  } catch (error) {
    return res.status(422).json({ ok: false, message: error.message || 'No se pudieron actualizar los jugadores.' });
  }
}

async function actualizarDisponibilidadInscripcion(req, res) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
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
  restablecerContrasenaUsuario,
  adminOverview,
  normalizeCategoryFilter,
  buildAdminStandings,
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
  guardarEstadisticasJugadores,
  eliminarJugador,
  subirImagenGaleria,
  eliminarImagenGaleria,
  cambiarEstadoImagenGaleria,
  actualizarDisponibilidadInscripcion,
  aprobarInscripcion,
  rechazarInscripcion,
  eliminarSolicitudInscripcion
};
