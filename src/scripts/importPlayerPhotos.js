const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const { connectDB } = require('../config/db');
require('../models/Team');
const Player = require('../models/Player');
const { savePlayerPhoto, removePlayerPhoto } = require('../services/player-photo.service');
const { validateImageBuffer } = require('../services/image-validation.service');

const inflateRaw = promisify(zlib.inflateRaw);
const MAX_ARCHIVE_ENTRIES = 10000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp']
]);

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readZipEntries(archive) {
  if (!Buffer.isBuffer(archive)) throw new Error('El archivo ZIP no se pudo leer.');
  if (archive.length < 22) throw new Error('El archivo no contiene un directorio ZIP válido.');
  const minEocd = Math.max(0, archive.length - 22 - 0xffff);
  let eocdOffset = -1;
  for (let offset = archive.length - 22; offset >= minEocd; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      const commentLength = archive.readUInt16LE(offset + 20);
      if (offset + 22 + commentLength === archive.length) {
        eocdOffset = offset;
        break;
      }
    }
  }
  if (eocdOffset < 0) throw new Error('El archivo no contiene un directorio ZIP válido.');

  const disk = archive.readUInt16LE(eocdOffset + 4);
  const centralDisk = archive.readUInt16LE(eocdOffset + 6);
  const diskEntries = archive.readUInt16LE(eocdOffset + 8);
  const totalEntries = archive.readUInt16LE(eocdOffset + 10);
  const centralSize = archive.readUInt32LE(eocdOffset + 12);
  const centralOffset = archive.readUInt32LE(eocdOffset + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw new Error('No se admiten archivos ZIP divididos en varios volúmenes.');
  }
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error('No se admiten directorios ZIP64.');
  }
  if (totalEntries > MAX_ARCHIVE_ENTRIES
    || centralOffset + centralSize > eocdOffset
    || centralOffset + centralSize > archive.length) {
    throw new Error('El directorio ZIP es inválido o excede el límite de entradas.');
  }

  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`La entrada ${index + 1} del directorio ZIP está dañada.`);
    }
    const flags = archive.readUInt16LE(offset + 8);
    const method = archive.readUInt16LE(offset + 10);
    const checksum = archive.readUInt32LE(offset + 16);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const diskStart = archive.readUInt16LE(offset + 34);
    const externalAttributes = archive.readUInt32LE(offset + 38);
    const localOffset = archive.readUInt32LE(offset + 42);
    const recordEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > archive.length) throw new Error(`La entrada ${index + 1} del ZIP está truncada.`);
    if (diskStart !== 0 || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error('No se admiten entradas ZIP64 ni entradas de varios volúmenes.');
    }
    const fileName = archive.toString('utf8', offset + 46, offset + 46 + nameLength);
    const unixMode = externalAttributes >>> 16;
    entries.push({
      fileName,
      flags,
      method,
      checksum,
      compressedSize,
      uncompressedSize,
      localOffset,
      isSymlink: (unixMode & 0xf000) === 0xa000,
      isDirectory: fileName.endsWith('/')
    });
    offset = recordEnd;
  }
  if (offset !== centralOffset + centralSize) throw new Error('El tamaño del directorio ZIP no coincide.');
  return entries;
}

async function extractZipEntry(archive, entry) {
  if (entry.flags & 1) throw new Error('La entrada está cifrada.');
  if (entry.method !== 0 && entry.method !== 8) throw new Error(`Método de compresión no admitido (${entry.method}).`);
  if (entry.uncompressedSize > MAX_IMAGE_BYTES) throw new Error('La imagen excede el límite de 15 MB.');
  const offset = entry.localOffset;
  if (offset + 30 > archive.length || archive.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error('La cabecera local de la entrada está dañada.');
  }
  const localNameLength = archive.readUInt16LE(offset + 26);
  const localExtraLength = archive.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + localNameLength + localExtraLength;
  const dataEnd = dataOffset + entry.compressedSize;
  if (dataEnd > archive.length) throw new Error('Los datos de la entrada están truncados.');
  const compressed = archive.subarray(dataOffset, dataEnd);
  const bytes = entry.method === 0
    ? Buffer.from(compressed)
    : await inflateRaw(compressed, { maxOutputLength: MAX_IMAGE_BYTES });
  if (bytes.length !== entry.uncompressedSize || crc32(bytes) !== entry.checksum) {
    throw new Error('La imagen no coincide con el tamaño o la suma de verificación del ZIP.');
  }
  return bytes;
}

function getSafeImagePath(fileName) {
  const clean = fileName.replace(/\\/g, '/');
  if (clean.includes('\0') || clean.startsWith('/') || /^[a-z]:/i.test(clean)) {
    throw new Error('La ruta del archivo no es relativa y segura.');
  }
  const parts = clean.split('/');
  if (parts.length !== 2 || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Se esperaba la ruta equipo/nombre-del-jugador.png.');
  }
  const extension = path.posix.extname(parts[1]).toLowerCase();
  if (!IMAGE_TYPES.has(extension)) throw new Error('La extensión debe ser PNG, JPG o WebP.');
  const playerName = path.posix.basename(parts[1], path.posix.extname(parts[1]));
  if (!normalizeName(parts[0]) || !normalizeName(playerName)) throw new Error('El nombre de equipo o jugador está vacío.');
  return { teamName: parts[0], playerName, extension, mimeType: IMAGE_TYPES.get(extension) };
}

function makePlayerKey(teamName, playerName) {
  return `${normalizeName(teamName)}\u0000${normalizeName(playerName)}`;
}

function isOrderedNameSubset(shortName, fullName) {
  const shortTokens = shortName.split(' ');
  const fullTokens = fullName.split(' ');
  let fullIndex = 0;
  return shortTokens.every((token) => {
    const matchIndex = fullTokens.indexOf(token, fullIndex);
    if (matchIndex < 0) return false;
    fullIndex = matchIndex + 1;
    return true;
  });
}

function buildImportPlan(entries, players) {
  const indexedPlayers = new Map();
  const indexedByTeam = new Map();
  for (const player of players) {
    const teamName = player.equipo_id?.nombre || player.teamName;
    if (!teamName) continue;
    const key = makePlayerKey(teamName, player.nombre);
    indexedPlayers.set(key, [...(indexedPlayers.get(key) || []), player]);
    const normalizedTeam = normalizeName(teamName);
    indexedByTeam.set(normalizedTeam, [...(indexedByTeam.get(normalizedTeam) || []), player]);
  }

  const reports = entries.map((entry) => {
    if (entry.isDirectory) return { status: 'ignored', fileName: entry.fileName, reason: 'Carpeta' };
    try {
      if (entry.isSymlink) throw new Error('No se admiten enlaces simbólicos.');
      const file = getSafeImagePath(entry.fileName);
      const exactMatches = indexedPlayers.get(makePlayerKey(file.teamName, file.playerName)) || [];
      const matches = exactMatches.length ? exactMatches : (indexedByTeam.get(normalizeName(file.teamName)) || [])
        .filter((player) => isOrderedNameSubset(normalizeName(file.playerName), normalizeName(player.nombre)));
      if (!matches.length) return {
        status: 'unmatched',
        fileName: entry.fileName,
        reason: 'No coincide el nombre normalizado del jugador y su equipo.',
        image: file,
        entry
      };
      if (matches.length > 1) return {
        status: 'ambiguous',
        fileName: entry.fileName,
        reason: `Hay ${matches.length} jugadores con ese nombre en el equipo.`,
        image: file,
        entry
      };
      return {
        status: 'pending',
        fileName: entry.fileName,
        player: matches[0],
        matchType: exactMatches.length ? 'exact' : 'partial',
        image: file,
        entry
      };
    } catch (error) {
      return { status: 'error', fileName: entry.fileName, reason: error.message };
    }
  });

  const seenPlayerIds = new Set();
  for (const report of reports.filter((item) => item.status === 'pending')) {
    const id = String(report.player._id || report.player.id);
    if (seenPlayerIds.has(id)) {
      report.status = 'ambiguous';
      report.reason = 'Más de un archivo del ZIP coincide con el mismo jugador.';
      const first = reports.find((item) => item !== report && item.status === 'pending'
        && String(item.player._id || item.player.id) === id);
      if (first) {
        first.status = 'ambiguous';
        first.reason = 'Más de un archivo del ZIP coincide con el mismo jugador.';
      }
    } else {
      seenPlayerIds.add(id);
    }
  }
  return reports;
}

async function importPlayerPhotos({ zipPath, apply = false, PlayerModel = Player, savePhoto = savePlayerPhoto }) {
  const archive = await fs.readFile(zipPath);
  const entries = readZipEntries(archive);
  const players = await PlayerModel.find().populate('equipo_id', 'nombre').lean();
  const reports = buildImportPlan(entries, players);

  for (const report of reports.filter((item) => item.entry && item.image)) {
    const isUniqueMatch = report.status === 'pending';
    if (isUniqueMatch) {
      report.playerId = String(report.player._id || report.player.id);
      report.playerName = report.player.nombre;
      report.teamName = report.player.equipo_id?.nombre || report.player.teamName;
    }
    let fotoUrl = '';
    try {
      const imageBuffer = await extractZipEntry(archive, report.entry);
      validateImageBuffer({
        originalname: path.posix.basename(report.fileName),
        mimetype: report.image.mimeType,
        buffer: imageBuffer
      }, 'La foto del jugador');
      if (apply && isUniqueMatch) {
        fotoUrl = await savePhoto({
          originalname: path.posix.basename(report.fileName),
          mimetype: report.image.mimeType,
          buffer: imageBuffer
        });
        const result = await PlayerModel.updateOne({ _id: report.playerId }, { $set: { fotoUrl } });
        if (!result.matchedCount) throw new Error('El jugador ya no existe en la base de datos.');
      }
      if (isUniqueMatch) report.status = apply ? 'updated' : 'matched';
      if (fotoUrl) report.fotoUrl = fotoUrl;
    } catch (error) {
      if (fotoUrl) await removePlayerPhoto(fotoUrl).catch(() => {});
      report.status = 'error';
      report.reason = error.message;
    }
    delete report.player;
    delete report.entry;
  }
  return reports;
}

function summarize(reports) {
  return reports.reduce((summary, report) => {
    summary[report.status] = (summary[report.status] || 0) + 1;
    return summary;
  }, {});
}

async function main(args = process.argv.slice(2)) {
  const apply = args.includes('--apply');
  const zipIndex = args.indexOf('--zip');
  const zipPath = zipIndex >= 0 ? args[zipIndex + 1] : '';
  if (!zipPath || zipPath.startsWith('--')) {
    throw new Error('Uso: npm run import:player-photos -- --zip <archivo.zip> [--apply]');
  }
  await connectDB();
  try {
    const reports = await importPlayerPhotos({ zipPath, apply });
    for (const report of reports) {
      const nameMatch = report.matchType === 'partial' ? ' (coincidencia por nombre parcial)' : '';
      const detail = report.reason || `${report.teamName} / ${report.playerName}${nameMatch}${report.fotoUrl ? ` → ${report.fotoUrl}` : ''}`;
      console.log(`[${report.status}] ${report.fileName}: ${detail}`);
    }
    console.log('Resumen:', summarize(reports));
    console.log(apply
      ? 'Importación aplicada. Las tarjetas muestran un recorte visual cuadrado centrado; no se ejecuta detección facial automática.'
      : 'Simulación solamente: no se escribieron imágenes ni se actualizaron documentos. Añade --apply para aplicar los cambios.');
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('No se pudo importar las fotos:', error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  normalizeName,
  crc32,
  readZipEntries,
  extractZipEntry,
  getSafeImagePath,
  buildImportPlan,
  isOrderedNameSubset,
  importPlayerPhotos,
  summarize,
  main
};
