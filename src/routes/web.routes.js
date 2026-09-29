// Importa Express para crear un enrutador independiente.
const express = require('express');
// Importa el controlador de la pagina principal.
const homeController = require('../controllers/home.controller');
const authController = require('../controllers/auth.controller');


// Crea el enrutador para las paginas web.
const router = express.Router();

const registerRoutes = ['/registro', '/register'];
const loginRoutes = ['/login'];
const calendarRoutes = ['/calendario', '/calendar'];

// Asocia la URL raiz con el controlador del home.
router.get('/', homeController.showHome);
calendarRoutes.forEach((route) => router.get(route, homeController.showCalendar));
router.get('/posiciones', homeController.showStandings);
router.get('/equipos', homeController.showTeams);
loginRoutes.forEach((route) => router.get(route, homeController.showLogin));
registerRoutes.forEach((route) => router.get(route, homeController.showRegister));
loginRoutes.forEach((route) => router.post(route, authController.login));
registerRoutes.forEach((route) => router.post(route, authController.register));
router.get('/logout', authController.logout);
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Exporta las rutas web para registrarlas en app.js.
module.exports = router;
