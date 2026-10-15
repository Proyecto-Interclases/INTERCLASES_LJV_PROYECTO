const express = require('express');
const adminController = require('../controllers/admin.controller');
const { esAdmin } = require('../middlewares/auth.middleware');
const { uploadShield, uploadGalleryImage, uploadAnnouncementImage } = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(esAdmin);
router.get('/', adminController.dashboard);
router.get('/dashboard', adminController.dashboard);
router.post('/inscripciones/disponibilidad', adminController.actualizarDisponibilidadInscripcion);
router.post('/inscripciones/:id/aprobar', adminController.aprobarInscripcion);
router.post('/inscripciones/:id/rechazar', adminController.rechazarInscripcion);
router.post('/inscripciones/:id/eliminar', adminController.eliminarSolicitudInscripcion);
router.post('/popup', uploadAnnouncementImage, adminController.guardarPopup);
router.post('/galeria', uploadGalleryImage, adminController.subirImagenGaleria);
router.post('/galeria/:id/eliminar', adminController.eliminarImagenGaleria);
router.post('/galeria/:id/estado', adminController.cambiarEstadoImagenGaleria);
router.post('/equipos', uploadShield, adminController.guardarEquipo);
router.post('/equipos/:id/editar', uploadShield, adminController.editarEquipo);
router.post('/equipos/:id/eliminar', adminController.eliminarEquipo);
router.post('/equipos/:id/estadisticas', adminController.guardarEstadisticasEquipo);
router.post('/equipos/:id/capitan', adminController.actualizarCapitanEquipo);
router.post('/jugadores', adminController.guardarJugador);
router.post('/jugadores/:id/editar', adminController.editarJugador);
router.post('/jugadores/:id/goles', adminController.guardarGolesJugador);
router.post('/jugadores/:id/eliminar', adminController.eliminarJugador);
router.post('/partidos', adminController.guardarPartido);
router.post('/partidos/:id/editar', adminController.editarPartido);
router.post('/partidos/:id/eliminar', adminController.eliminarPartido);
router.post('/partidos/:id/resultados', adminController.guardarResultado);

module.exports = router;
