const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    match: /^imagen-[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i
  },
  title: {
    type: String,
    trim: true,
    maxlength: 140,
    default: ''
  }
}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: false
  }
});

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
