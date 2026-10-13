const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateImageBuffer } = require('./image-validation.service');

const announcementImageDirectory = path.join(__dirname, '..', 'public', 'uploads', 'anuncios');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function saveAnnouncementImages(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 5) {
    throw new Error('Selecciona entre una y cinco imágenes para el anuncio.');
  }

  await fs.mkdir(announcementImageDirectory, { recursive: true });
  const savedUrls = [];

  try {
    for (const file of files) {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.has(extension)) {
        throw new Error('La imagen del anuncio debe ser JPG, PNG o WebP.');
      }
      validateImageBuffer(file, 'La imagen del anuncio');

      const filename = `anuncio-${crypto.randomUUID()}${extension}`;
      await fs.writeFile(path.join(announcementImageDirectory, filename), file.buffer, { flag: 'wx' });
      savedUrls.push(`/uploads/anuncios/${filename}`);
    }
  } catch (error) {
    await Promise.all(savedUrls.map((url) => removeAnnouncementImage(url)));
    throw error;
  }

  return savedUrls;
}

async function removeAnnouncementImage(url) {
  const match = String(url || '').match(/^\/uploads\/anuncios\/(anuncio-[a-f\d-]+\.(?:jpg|jpeg|png|webp))$/i);
  if (!match) return;
  await fs.unlink(path.join(announcementImageDirectory, match[1])).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

module.exports = { saveAnnouncementImages, removeAnnouncementImage };
