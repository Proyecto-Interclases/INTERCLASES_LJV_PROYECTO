const multer = require('multer');
const { validateImageBuffer } = require('../services/image-validation.service');

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function createImageUpload({ field, maxSize, label, maxCount = 1 }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize, files: maxCount },
    fileFilter: (req, file, callback) => {
      if (!imageTypes.has(file.mimetype)) {
        const error = new Error(`${label} solo admite imágenes JPG, PNG o WebP.`);
        error.code = 'INVALID_IMAGE_TYPE';
        callback(error);
        return;
      }

      callback(null, true);
    }
  });
  const parse = maxCount > 1 ? upload.array(field, maxCount) : upload.single(field);

  return (req, res, next) => {
    parse(req, res, (error) => {
      const files = req.files || (req.file ? [req.file] : []);
      if (!error) {
        try {
          files.forEach((file) => validateImageBuffer(file, label));
          return next();
        } catch (validationError) {
          return respondWithUploadError(req, res, validationError.message);
        }
      }

      if (error.code === 'INVALID_IMAGE_TYPE') {
        return respondWithUploadError(req, res, error.message);
      }

      if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
          ? `${label}: el archivo supera el tamaño máximo permitido.`
          : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
            ? `${label}: selecciona como máximo ${maxCount} archivo${maxCount === 1 ? '' : 's'}.`
            : `${label}: no se pudo procesar el archivo seleccionado.`;
        return respondWithUploadError(req, res, message);
      }

      return next(error);
    });
  };
}

function respondWithUploadError(req, res, message) {
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(422).json({ ok: false, message });
  }
  return res.redirect(303, `/admin?error=${encodeURIComponent(message)}`);
}

const uploadShield = createImageUpload({
  field: 'escudo',
  maxSize: 1.5 * 1024 * 1024,
  label: 'El escudo'
});

const uploadGalleryImage = createImageUpload({
  field: 'imagen',
  maxSize: 8 * 1024 * 1024,
  label: 'La galería',
  maxCount: 10
});

const uploadAnnouncementImage = createImageUpload({
  field: 'imagenAnuncio',
  maxSize: 3 * 1024 * 1024,
  label: 'La imagen del anuncio',
  maxCount: 5
});

const uploadPlayerPhoto = createImageUpload({
  field: 'foto',
  maxSize: 3 * 1024 * 1024,
  label: 'La foto del jugador'
});

module.exports = { uploadShield, uploadGalleryImage, uploadAnnouncementImage, uploadPlayerPhoto };
