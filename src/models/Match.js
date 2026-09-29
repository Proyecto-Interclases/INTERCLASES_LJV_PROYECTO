const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  equipoLocalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  equipoVisitanteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  equipo_a: {
    type: String,
    required: true
  },
  equipo_b: {
    type: String,
    required: true
  },
  goles_a: {
    type: Number,
    default: 0
  },
  goles_b: {
    type: Number,
    default: 0
  },
  fecha: {
    type: String,
    required: true
  },
  hora: {
    type: String,
    required: true
  },
  cancha: {
    type: String,
    default: ''
  },
  resultado: {
    type: String,
    default: null
  },
  estado: {
    type: String,
    enum: ['Por jugar', 'Jugando', 'Finalizado'],
    default: 'Por jugar'
  }
}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: false
  }
});

module.exports = mongoose.model('Match', matchSchema);
