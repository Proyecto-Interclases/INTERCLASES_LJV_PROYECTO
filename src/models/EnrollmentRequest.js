const mongoose = require('mongoose');
const { SPORT_IDS } = require('../constants/sports');
const TEAM_CATEGORIES = require('../constants/team-categories');
const LEGACY_TEAM_CATEGORIES = require('../constants/legacy-team-categories');

const rosterPlayerSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  numero_camiseta: {
    type: String,
    required: true,
    validate: {
      validator: (value) => /^\d{1,3}$/.test(value) && Number(value) <= 999,
      message: 'El número de camiseta debe ser un entero entre 0 y 999.'
    }
  }
}, { _id: false });

const enrollmentRequestSchema = new mongoose.Schema({
  deporte: { type: String, enum: SPORT_IDS, required: true },
  nombreEquipo: { type: String, required: true, trim: true, maxlength: 80 },
  categoria: { type: String, enum: [...TEAM_CATEGORIES, ...LEGACY_TEAM_CATEGORIES], required: true },
  grado: { type: String, required: true, trim: true, maxlength: 40 },
  responsable: { type: String, required: true, trim: true, maxlength: 100 },
  contacto: { type: String, required: true, trim: true, maxlength: 120 },
  jugadores: { type: [rosterPlayerSchema], required: true, validate: [(players) => players.length >= 1 && players.length <= 30, 'La plantilla debe tener entre 1 y 30 jugadores.'] },
  estado: { type: String, enum: ['pendiente', 'procesando', 'aprobada', 'rechazada'], default: 'pendiente' },
  equipoCreadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}, { timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' } });

enrollmentRequestSchema.index({ estado: 1, creado_en: -1 });

module.exports = mongoose.model('EnrollmentRequest', enrollmentRequestSchema);
