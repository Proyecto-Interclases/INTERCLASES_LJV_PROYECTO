// Importa el servicio que contiene la logica del torneo.
const tournamentService = require('../services/tournament.service');
const { getPopup } = require('../services/admin.service');
const { listGalleryImages } = require('../services/gallery.service');
const { SPORTS, SPORT_IDS } = require('../constants/sports');
const TEAM_CATEGORIES = require('../constants/team-categories');
const enrollmentService = require('../services/enrollment.service');

function buildSportLinks(path, query = {}) {
  const requested = String(query.deporte || '').trim().toLowerCase();
  const selectedSport = SPORT_IDS.includes(requested) ? requested : 'futbol';
  const selectedCategory = TEAM_CATEGORIES.includes(String(query.categoria || '').trim())
    ? String(query.categoria).trim()
    : '';
  const sports = SPORTS.map((sport) => {
    const params = new URLSearchParams({ deporte: sport.id });
    if (selectedCategory) params.set('categoria', selectedCategory);
    if (query.orden === 'asc') params.set('orden', 'asc');
    if (query.tab) params.set('tab', String(query.tab));
    return { ...sport, href: `${path}?${params.toString()}` };
  });
  return { selectedSport, sports };
}

// Atiende la solicitud de la pagina principal.
async function showHome(req, res, next) {
  // Intenta preparar y renderizar la vista.
  try {
    const { sports } = buildSportLinks('/calendario');
    const [matchSections, popup, galleryImages] = await Promise.all([
      tournamentService.getHomeMatchSections(),
      getPopup(),
      listGalleryImages()
    ]);
    const activeGalleryImages = galleryImages.filter((image) => image.activo);

    // Renderiza index.ejs y le entrega los datos necesarios.
    res.render('index', {
      // Define el titulo que aparece en el navegador.
      title: 'Interclases Lucrecio Jaramillo',
      liveMatches: matchSections.liveMatches,
      latestMatches: matchSections.latestMatches,
      sports,
      galleryImages: activeGalleryImages,
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

async function getLiveMatches(req, res, next) {
  try {
    const liveMatches = await tournamentService.getLiveMatches();
    return res.json({ ok: true, liveMatches });
  } catch (error) {
    return next(error);
  }
}

function showLogin(req, res) {
  const enrollmentAuthMessage = req.query.error === 'registrate_para_inscribir'
    ? 'Debes registrar e iniciar sesión antes de poder inscribir un equipo.'
    : null;
  res.render('login', {
    title: 'Iniciar sesión | Interclases Lucrecio Jaramillo',
    error: enrollmentAuthMessage || req.query.error || null,
    success: req.query.success || null,
    formData: {}
  });
}

function showRegister(req, res) {
  res.render('register', {
    title: 'Registro | Interclases Lucrecio Jaramillo',
    error: null,
    formData: {}
  });
}

// Atiende la solicitud del calendario de partidos.
async function showCalendar(req, res, next) {
  try {
    const { selectedSport, sports } = buildSportLinks(req.path, req.query);
    const { upcoming, finished, all } = await tournamentService.getCalendarMatches(selectedSport);
    const activeTab = req.query.tab === 'jugados' || req.query.tab === 'resultados' ? 'jugados' : 'proximos';

    res.render('pages/calendar', {
      title: 'Calendario de Partidos | Interclases Lucrecio Jaramillo',
      upcoming,
      finished,
      all,
      activeTab,
      selectedSport,
      sports,
      currentPath: req.path,
      user: req.session && req.session.user ? req.session.user : null
    });
  } catch (error) {
    next(error);
  }
}

async function showStandings(req, res, next) {
  try {
    const requestedCategory = String(req.query.categoria || '').trim();
    const selectedCategory = TEAM_CATEGORIES.includes(requestedCategory) ? requestedCategory : '';
    const { selectedSport, sports } = buildSportLinks(req.path, req.query);
    const [standings, categories] = await Promise.all([
      tournamentService.getStandings(selectedCategory, selectedSport),
      tournamentService.getTeamsPageData('', selectedSport).then((data) => data.categories)
    ]);

    res.render('pages/standings', {
      title: 'Posiciones | Interclases Lucrecio Jaramillo',
      standings,
      categories: [...categories].sort(),
      selectedCategory,
      selectedSport,
      sports,
      user: req.session?.user || null
    });
  } catch (error) {
    next(error);
  }
}

async function showTeams(req, res, next) {
  try {
    const requestedCategory = String(req.query.categoria || '').trim();
    const selectedCategory = TEAM_CATEGORIES.includes(requestedCategory) ? requestedCategory : '';
    const selectedOrder = req.query.orden === 'asc' ? 'asc' : 'desc';
    const { selectedSport, sports } = buildSportLinks(req.path, req.query);
    const [{ teams, categories }, topScorers] = await Promise.all([
      tournamentService.getTeamsPageData(selectedCategory, selectedSport, selectedOrder),
      tournamentService.getTopScorers(10, selectedCategory, selectedSport)
    ]);

    res.render('pages/teams', {
      title: 'Equipos y goleadores | Interclases Lucrecio Jaramillo',
      teams,
      categories,
      selectedCategory,
      selectedOrder,
      selectedSport,
      sports,
      topScorers,
      user: req.session?.user || null
    });
  } catch (error) {
    next(error);
  }
}

async function showEnrollments(req, res, next) {
  try {
    const [activeSports, enrollmentConfig] = await Promise.all([
      enrollmentService.getActiveSports(),
      enrollmentService.getEnrollmentConfig()
    ]);
    res.render('pages/enrollment', {
      title: 'Inscripciones | Interclases Lucrecio Jaramillo',
      activeSports,
      inscripcionesAbiertas: enrollmentConfig.inscripcionesAbiertas,
      categories: TEAM_CATEGORIES,
      success: req.query.enviado === '1',
      error: null,
      formData: {},
      user: req.session?.user || null
    });
  } catch (error) {
    next(error);
  }
}

async function submitEnrollment(req, res, next) {
  const formData = req.body || {};
  try {
    await enrollmentService.submitEnrollment(formData);
    const [activeSports, enrollmentConfig] = await Promise.all([
      enrollmentService.getActiveSports(),
      enrollmentService.getEnrollmentConfig()
    ]);
    res.status(201).render('pages/enrollment', {
      title: 'Inscripciones | Interclases Lucrecio Jaramillo',
      activeSports,
      inscripcionesAbiertas: enrollmentConfig.inscripcionesAbiertas,
      categories: TEAM_CATEGORIES,
      success: true,
      error: null,
      formData: {},
      user: req.session?.user || null
    });
  } catch (error) {
    try {
      const [activeSports, enrollmentConfig] = await Promise.all([
        enrollmentService.getActiveSports(),
        enrollmentService.getEnrollmentConfig()
      ]);
      res.status(422).render('pages/enrollment', {
        title: 'Inscripciones | Interclases Lucrecio Jaramillo',
        activeSports,
        inscripcionesAbiertas: enrollmentConfig.inscripcionesAbiertas,
        categories: TEAM_CATEGORIES,
        success: false,
        error: error.message || 'No fue posible enviar la solicitud. Intenta de nuevo.',
        formData,
        user: req.session?.user || null
      });
    } catch (renderError) {
      next(renderError);
    }
  }
}

// Exporta el controlador para conectarlo con las rutas web.
module.exports = { showHome, getLiveMatches, showLogin, showRegister, showCalendar, showStandings, showTeams, showEnrollments, submitEnrollment, buildSportLinks };
