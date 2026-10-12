const multer = require('multer');

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function createImageUpload({ field, maxSize, label }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, callback) => {
      if (!imageTypes.has(file.mimetype)) {
        const error = new Error(`${label} solo admite imágenes JPG, PNG o WebP.`);
        error.code = 'INVALID_IMAGE_TYPE';
        callback(error);
        return;
      }

      callback(null, true);
    }
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) return next();

      if (error.code === 'INVALID_IMAGE_TYPE') {
        return res.redirect(303, `/admin?error=${encodeURIComponent(error.message)}`);
      }

      if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
          ? `${label}: el archivo supera el tamaño máximo permitido.`
          : `${label}: no se pudo procesar el archivo seleccionado.`;
        return res.redirect(303, `/admin?error=${encodeURIComponent(message)}`);
      }

      return next(error);
    });
  };
}

const uploadShield = createImageUpload({
  field: 'escudo',
  maxSize: 1.5 * 1024 * 1024,
  label: 'El escudo'
});

const uploadGalleryImage = createImageUpload({
  field: 'imagen',
  maxSize: 8 * 1024 * 1024,
  label: 'La galería'
});

module.exports = { uploadShield, uploadGalleryImage };
