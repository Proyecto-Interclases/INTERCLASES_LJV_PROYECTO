const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/admin.controller');
const { esAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();
const uploadShield = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 1.5 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
			callback(new Error('El escudo debe ser una imagen JPG, PNG o WebP.'));
			return;
		}
		callback(null, true);
	}
});

router.use(esAdmin);
router.get('/', adminController.dashboard);
router.get('/dashboard', adminController.dashboard);
router.post('/popup', adminController.guardarPopup);
router.post('/equipos', uploadShield.single('escudo'), adminController.guardarEquipo);
router.post('/equipos/:id/estadisticas', adminController.guardarEstadisticasEquipo);
router.post('/jugadores', adminController.guardarJugador);
router.post('/jugadores/:id/goles', adminController.guardarGolesJugador);
router.post('/jugadores/:id/eliminar', adminController.eliminarJugador);
router.post('/partidos', adminController.guardarPartido);
router.post('/partidos/:id/editar', adminController.editarPartido);
router.post('/partidos/:id/eliminar', adminController.eliminarPartido);
router.post('/partidos/:id/resultados', adminController.guardarResultado);

module.exports = router;
