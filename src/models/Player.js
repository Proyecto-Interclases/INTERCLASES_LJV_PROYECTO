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
  grado: {
    type: String,
    required: true,
    trim: true
  },
  numero_camiseta: {
    type: String,
    default: '0',
    validate: {
      validator: (value) => /^\d{1,3}$/.test(value) && Number(value) <= 999,
      message: 'El número de camiseta debe ser un entero entre 0 y 999.'
    }
  },
  posicion: {
    type: String,
    default: '',
    trim: true
  },
  fotoUrl: {
    type: String,
    default: '',
    trim: true,
    maxlength: 300
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