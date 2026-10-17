const mongoose = require('mongoose');

const TEAM_CATEGORIES = require('../constants/team-categories');
const LEGACY_TEAM_CATEGORIES = require('../constants/legacy-team-categories');
const { SPORT_IDS } = require('../constants/sports');

const teamSchema = new mongoose.Schema({
  deporte: {
    type: String,
    enum: SPORT_IDS,
    default: 'futbol',
    required: true
  },
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  categoria: {
    type: String,
    required: true,
    enum: [...TEAM_CATEGORIES, ...LEGACY_TEAM_CATEGORIES],
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