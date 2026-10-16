const mongoose = require('mongoose');

const tournamentConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  inscripcionesAbiertas: { type: Boolean, default: false, required: true },
  deportesHabilitados: {
    futbol: { type: Boolean, default: true },
    baloncesto: { type: Boolean, default: true },
    voleibol: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('TournamentConfig', tournamentConfigSchema);
