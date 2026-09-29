const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  equipo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  numero_camiseta: {
    type: Number,
    default: 0,
    min: 0,
    max: 99
  },
  posicion: {
    type: String,
    default: 'Sin definir',
    trim: true
  },
  goles: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: false
  }
});

module.exports = mongoose.model('Player', playerSchema);