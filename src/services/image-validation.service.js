const path = require('node:path');

const imageSignatures = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
};

function validateImageBuffer(file, label) {
  const extension = path.extname(file?.originalname || '').toLowerCase();
  const mimeForExtension = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  }[extension];
  if (!file || !Buffer.isBuffer(file.buffer) || !imageSignatures[file.mimetype]?.(file.buffer) || mimeForExtension !== file.mimetype) {
    throw new Error(`${label} debe ser una imagen JPG, PNG o WebP válida.`);
  }
}

module.exports = { validateImageBuffer };
