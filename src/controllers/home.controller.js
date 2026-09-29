// Importa el servicio que contiene la logica del torneo.
const tournamentService = require('../services/tournament.service');
const { getPopup } = require('../services/admin.service');
const Team = require('../models/Team');

// Atiende la solicitud de la pagina principal.
async function showHome(req, res, next) {
  // Intenta preparar y renderizar la vista.
  try {
    const summary = await tournamentService.getSummary();
    const matches = await tournamentService.getMatches();
    const popup = await getPopup();

    // Renderiza index.ejs y le entrega los datos necesarios.
    res.render('index', {
      // Define el titulo que aparece en el navegador.
      title: 'Interclases LJV',
      // Entrega el resumen de equipos y partidos.
      summary,
      // Entrega la lista de partidos para mostrarla en la vista.
      matches,
      popup,
      error: req.query.error || null,
      user: req.session && req.session.user ? req.session.user : null
    });
  // Captura cualquier error ocurrido durante el renderizado.
  } catch (error) {
    // Envia el error al middleware global.
    next(error);
  }
}

function showLogin(req, res) {
  res.render('login', {
    title: 'Iniciar sesión | Interclases LJV',
    error: req.query.error || null,
    success: req.query.success || null,
    formData: {}
  });
}

function showRegister(req, res) {
  res.render('register', {
    title: 'Registro | Interclases LJV',
    error: null,
    formData: {}
  });
}

// Atiende la solicitud del calendario de partidos.
async function showCalendar(req, res, next) {
  try {
    const { upcoming, finished, all } = await tournamentService.getCalendarMatches();
    const activeTab = req.query.tab === 'jugados' || req.query.tab === 'resultados' ? 'jugados' : 'proximos';

    res.render('pages/calendar', {
      title: 'Calendario de Partidos | Interclases LJV',
      upcoming,
      finished,
      all,
      activeTab,
      currentPath: req.path,
      user: req.session && req.session.user ? req.session.user : null
    });
  } catch (error) {
    next(error);
  }
}

async function showStandings(req, res, next) {
  try {
    const selectedCategory = String(req.query.categoria || '').trim();
    const [standings, categories] = await Promise.all([
      tournamentService.getStandings(selectedCategory),
      Team.distinct('categoria')
    ]);

    res.render('pages/standings', {
      title: 'Posiciones | Interclases LJV',
      standings,
      categories: categories.sort(),
      selectedCategory,
      user: req.session?.user || null
    });
  } catch (error) {
    next(error);
  }
}

async function showTeams(req, res, next) {
  try {
    const selectedCategory = String(req.query.categoria || '').trim();
    const [{ teams, categories }, topScorers] = await Promise.all([
      tournamentService.getTeamsPageData(selectedCategory),
      tournamentService.getTopScorers(10, selectedCategory)
    ]);

    res.render('pages/teams', {
      title: 'Equipos y goleadores | Interclases LJV',
      teams,
      categories,
      selectedCategory,
      topScorers,
      user: req.session?.user || null
    });
  } catch (error) {
    next(error);
  }
}

// Exporta el controlador para conectarlo con las rutas web.
module.exports = { showHome, showLogin, showRegister, showCalendar, showStandings, showTeams };
