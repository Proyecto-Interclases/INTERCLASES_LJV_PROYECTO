const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateImageBuffer } = require('./image-validation.service');

const photoDirectory = path.join(__dirname, '..', 'public', 'uploads', 'jugadores');
const extensionsByMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const managedPhotoPattern = /^\/uploads\/jugadores\/jugador-[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}\.(?:jpg|png|webp)$/i;

function isManagedPlayerPhotoUrl(url) {
  return typeof url === 'string' && managedPhotoPattern.test(url);
}

async function savePlayerPhoto(file) {
  if (!file || !extensionsByMime[file.mimetype]) {
    throw new Error('Selecciona una foto JPG, PNG o WebP válida.');
  }
  validateImageBuffer(file, 'La foto del jugador');

  const filename = `jugador-${crypto.randomUUID()}${extensionsByMime[file.mimetype]}`;
  await fs.mkdir(photoDirectory, { recursive: true });
  await fs.writeFile(path.join(photoDirectory, filename), file.buffer, { flag: 'wx' });
  return `/uploads/jugadores/${filename}`;
}

async function removePlayerPhoto(url) {
  if (!isManagedPlayerPhotoUrl(url)) return;
  const filename = path.basename(url);
  await fs.unlink(path.join(photoDirectory, filename)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

module.exports = { isManagedPlayerPhotoUrl, savePlayerPhoto, removePlayerPhoto };
