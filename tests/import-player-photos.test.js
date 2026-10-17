const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  normalizeName,
  crc32,
  readZipEntries,
  extractZipEntry,
  getSafeImagePath,
  buildImportPlan,
  importPlayerPhotos
} = require('../src/scripts/importPlayerPhotos');

function makeZip(fileName, contents) {
  const name = Buffer.from(fileName);
  const checksum = crc32(contents);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(contents.length, 18);
  local.writeUInt32LE(contents.length, 22);
  local.writeUInt16LE(name.length, 26);
  const localRecord = Buffer.concat([local, name, contents]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x800, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(contents.length, 20);
  central.writeUInt32LE(contents.length, 24);
  central.writeUInt16LE(name.length, 28);
  const centralRecord = Buffer.concat([central, name]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralRecord.length, 12);
  eocd.writeUInt32LE(localRecord.length, 16);
  return Buffer.concat([localRecord, centralRecord, eocd]);
}

test('photo importer normalizes accents and punctuation and requires both team and player names', () => {
  assert.equal(normalizeName('  Jerónimo   Ocampo. '), 'jeronimo ocampo');
  const players = [
    { _id: 'a', nombre: 'Jerónimo Ocampo', equipo_id: { nombre: 'Brasil' } },
    { _id: 'b', nombre: 'Jerónimo Ocampo', equipo_id: { nombre: 'Argentina' } }
  ];
  const reports = buildImportPlan([
    { fileName: 'COLOMBIA/Jeronimo_Ocampo.png' },
    { fileName: 'BRASIL/Jeronimo Ocampo.png' },
    { fileName: 'BRASIL/No existe.png' }
  ], players);

  assert.equal(reports[0].status, 'unmatched');
  assert.equal(reports[1].status, 'pending');
  assert.equal(reports[2].status, 'unmatched');
});

test('photo importer marks duplicate archive files for one player as ambiguous', () => {
  const players = [{ _id: 'a', nombre: 'Jerónimo Ocampo', equipo_id: { nombre: 'Brasil' } }];
  const reports = buildImportPlan([
    { fileName: 'Brasil/Jeronimo_Ocampo.png' },
    { fileName: 'BRASIL/Jeronimo Ocampo.PNG' }
  ], players);
  assert.deepEqual(reports.map(({ status }) => status), ['ambiguous', 'ambiguous']);
});

test('photo importer matches a unique ordered subset when the database includes a middle name', () => {
  const players = [{
    _id: 'a',
    nombre: 'Ana Sofía Álzate',
    equipo_id: { nombre: 'Portugal' }
  }];
  const reports = buildImportPlan([{ fileName: 'PORTUGAL/Ana Alzate.png' }], players);

  assert.equal(reports[0].status, 'pending');
  assert.equal(reports[0].matchType, 'partial');
  assert.equal(reports[0].player._id, 'a');
});

test('photo importer refuses partial-name matches when multiple players are possible', () => {
  const players = [
    { _id: 'a', nombre: 'Ana Sofía Álzate', equipo_id: { nombre: 'Portugal' } },
    { _id: 'b', nombre: 'Ana María Álzate', equipo_id: { nombre: 'Portugal' } }
  ];
  const reports = buildImportPlan([{ fileName: 'PORTUGAL/Ana Alzate.png' }], players);

  assert.equal(reports[0].status, 'ambiguous');
});

test('photo importer rejects traversal and unsupported archive entry paths', () => {
  assert.throws(() => getSafeImagePath('../outside.png'), /ruta equipo\/nombre/);
  assert.throws(() => getSafeImagePath('Equipo/../../outside.png'), /ruta equipo\/nombre/);
  assert.throws(() => getSafeImagePath('Equipo/subfolder/Foto.png'), /ruta equipo\/nombre/);
  assert.throws(() => getSafeImagePath('Equipo/FOTO.gif'), /extensión/);
});

test('ZIP reader extracts a verified image entry and the dry run does not write or update', async () => {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const zip = makeZip('Brasil/Jeronimo Ocampo.png', pngSignature);
  const [entry] = readZipEntries(zip);
  assert.deepEqual(await extractZipEntry(zip, entry), pngSignature);

  let updateCalled = false;
  let saveCalled = false;
  const PlayerModel = {
    find() {
      return {
        populate() {
          return this;
        },
        async lean() {
          return [{ _id: 'player-1', nombre: 'Jerónimo Ocampo', equipo_id: { nombre: 'Brasil' } }];
        }
      };
    },
    async updateOne() {
      updateCalled = true;
      return { matchedCount: 1 };
    }
  };
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ljv-photos-'));
  const archivePath = path.join(directory, 'players.zip');
  try {
    await fs.writeFile(archivePath, zip);
    const dryRunReports = await importPlayerPhotos({ zipPath: archivePath, PlayerModel, savePhoto: async () => { saveCalled = true; } });
    assert.equal(dryRunReports[0].status, 'matched');
    assert.equal(updateCalled, false);
    assert.equal(saveCalled, false);

    const applyReports = await importPlayerPhotos({
      zipPath: archivePath,
      apply: true,
      PlayerModel,
      savePhoto: async () => {
        saveCalled = true;
        return '/uploads/jugadores/jugador-123e4567-e89b-42d3-a456-426614174000.png';
      }
    });
    assert.equal(applyReports[0].status, 'updated');
    assert.equal(updateCalled, true);
    assert.equal(saveCalled, true);
    assert.equal(applyReports[0].fotoUrl, '/uploads/jugadores/jugador-123e4567-e89b-42d3-a456-426614174000.png');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('ZIP reader rejects corrupt checksums', async () => {
  const zip = makeZip('Equipo/Jugador.png', Buffer.from('payload'));
  const entry = readZipEntries(zip)[0];
  const corrupted = Buffer.from(zip);
  const localDataStart = 30 + Buffer.byteLength(entry.fileName);
  corrupted[localDataStart] ^= 1;
  await assert.rejects(extractZipEntry(corrupted, entry), /suma de verificación/);
});
