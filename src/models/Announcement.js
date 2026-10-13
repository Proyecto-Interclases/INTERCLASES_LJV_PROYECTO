const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  mensaje: {
    type: String,
    required: true,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  imagenUrl: {
    type: String,
    default: '',
    maxlength: 4300000
  },
  imagenes: {
    type: [String],
    default: [],
    validate: {
      validator: (images) => images.length <= 5 && images.every((image) => image.length <= 4300000),
      message: 'El anuncio admite hasta cinco imágenes.'
    }
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);
