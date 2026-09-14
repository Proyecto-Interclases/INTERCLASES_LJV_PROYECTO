const { createEquipo, addJugador, createPartido, actualizarResultadoPartido, listarPartidos } = require('../services/gestion.service');
const { listAdminTeams, MATCH_STATUSES, getPopup, updatePopup, listPlayers, listUsers, updateTeamStats, updateMatch, deleteMatch, deletePlayer } = require('../services/admin.service');

async function dashboardData() {
  const [equipos, partidos, popup, jugadores, usuarios] = await Promise.all([
    listAdminTeams(),
    listarPartidos(),
    getPopup(),
    listPlayers(),
    listUsers()
  ]);

  return { equipos, partidos, popup, jugadores, usuarios, estadosPartido: MATCH_STATUSES };
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
      estadosPartido: MATCH_STATUSES,
      error: loadError.message,
      success: null
    });
  }
}

function dashboard(req, res) {
  return renderDashboard(req, res);
}

async function guardarPopup(req, res) {
  try {
    await updatePopup(req.body);
    return renderDashboard(req, res, { success: 'Configuración del pop-up actualizada.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function guardarPartido(req, res) {
  try {
    await createPartido(req.body);
    return renderDashboard(req, res, { success: 'Partido creado correctamente.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function editarPartido(req, res) {
  try {
    await updateMatch({ ...req.body, matchId: req.params.id });
    return renderDashboard(req, res, { success: 'Partido actualizado correctamente.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function eliminarPartido(req, res) {
  try {
    await deleteMatch(req.params.id);
    return renderDashboard(req, res, { success: 'Partido eliminado correctamente.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function guardarResultado(req, res) {
  try {
    const resultado = await actualizarResultadoPartido({
      partidoId: req.params.id,
      golesLocal: req.body.golesLocal,
      golesVisitante: req.body.golesVisitante
    });
    return renderDashboard(req, res, { success: `Resultado actualizado: ${resultado.resultado}` });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function guardarEquipo(req, res) {
  try {
    await createEquipo(req.body);
    return renderDashboard(req, res, { success: 'Equipo creado correctamente.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function guardarEstadisticasEquipo(req, res) {
  try {
    await updateTeamStats({ ...req.body, teamId: req.params.id });
    return renderDashboard(req, res, { success: 'Posición y estadísticas actualizadas.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function guardarJugador(req, res) {
  try {
    await addJugador(req.body);
    return renderDashboard(req, res, { success: 'Jugador agregado a la plantilla.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

async function eliminarJugador(req, res) {
  try {
    await deletePlayer(req.params.id);
    return renderDashboard(req, res, { success: 'Jugador eliminado de la plantilla.' });
  } catch (error) {
    return renderDashboard(req, res, { error: error.message });
  }
}

module.exports = {
  dashboard,
  guardarPopup,
  guardarPartido,
  editarPartido,
  eliminarPartido,
  guardarResultado,
  guardarEquipo,
  guardarEstadisticasEquipo,
  guardarJugador,
  eliminarJugador
};
