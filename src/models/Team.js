const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  categoria: {
    type: String,
    required: true,
    trim: true
  },
  escudoUrl: {
    type: String,
    default: '',
    trim: true
  },
  puntos: {
    type: Number,
    default: 0
  },
  goles_favor: {
    type: Number,
    default: 0
  },
  goles_contra: {
    type: Number,
    default: 0
  },
  capitanEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: false
  }
});

module.exports = mongoose.model('Team', teamSchema);