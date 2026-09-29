const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const GalleryImage = require('../models/GalleryImage');

const galleryDirectory = path.join(__dirname, '..', 'public', 'uploads', 'galeria');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function isGalleryFilename(filename) {
  return /^(?:galeria-\d{2}|imagen-[a-f0-9-]+)\.(?:jpg|jpeg|png|webp)$/i.test(filename);
}

async function listGalleryImages() {
  await fs.mkdir(galleryDirectory, { recursive: true });
  const filenames = (await fs.readdir(galleryDirectory))
    .filter((filename) => isGalleryFilename(filename))
    .sort((first, second) => first.localeCompare(second, 'es', { numeric: true }));

  if (!filenames.length) return [];

  const metadata = await GalleryImage.find({ filename: { $in: filenames } }).lean();
  const metadataByFilename = new Map(metadata.map((image) => [image.filename, image]));

  return filenames.map((filename) => {
    const image = metadataByFilename.get(filename);
    return {
      id: image ? image._id.toString() : filename,
      filename,
      url: `/uploads/galeria/${encodeURIComponent(filename)}`,
      title: image?.title || '',
      alt: image?.title || 'Fotografía de las Interclases LJV 2026'
    };
  });
}

async function saveGalleryImage(file, title) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error('Selecciona una imagen JPG, PNG o WebP.');
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error('La imagen debe ser JPG, PNG o WebP.');
  }

  const cleanTitle = String(title || '').trim();
  if (cleanTitle.length > 140) {
    throw new Error('El título no puede superar los 140 caracteres.');
  }

  await fs.mkdir(galleryDirectory, { recursive: true });
  const filename = `imagen-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(galleryDirectory, filename);

  await fs.writeFile(filePath, file.buffer, { flag: 'wx' });

  try {
    const image = await GalleryImage.create({ filename, title: cleanTitle });
    return {
      id: image._id.toString(),
      filename,
      url: `/uploads/galeria/${encodeURIComponent(filename)}`,
      title: image.title,
      alt: image.title || 'Fotografía de las Interclases LJV 2026'
    };
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    throw error;
  }
}

async function deleteGalleryImage(identifier) {
  const value = String(identifier || '');
  const image = /^[a-f\d]{24}$/i.test(value)
    ? await GalleryImage.findById(value)
    : await GalleryImage.findOne({ filename: value });
  const filename = image ? image.filename : value;

  if (!isGalleryFilename(filename)) {
    throw new Error('La imagen solicitada no existe.');
  }

  const filePath = path.resolve(galleryDirectory, filename);
  if (path.dirname(filePath) !== path.resolve(galleryDirectory)) {
    throw new Error('La ruta de la imagen no es válida.');
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (image) await image.deleteOne();
  return { filename };
}

module.exports = { listGalleryImages, saveGalleryImage, deleteGalleryImage };
