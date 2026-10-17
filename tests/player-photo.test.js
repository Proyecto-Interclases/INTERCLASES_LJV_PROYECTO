const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const Player = require('../src/models/Player');
const { savePlayerPhoto, removePlayerPhoto } = require('../src/services/player-photo.service');

test('player photo upload persists validated bytes under a managed URL and removes them safely', async () => {
  const fotoUrl = await savePlayerPhoto({
    originalname: 'portrait.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00])
  });
  const photoPath = path.join(__dirname, '..', 'src', 'public', fotoUrl.slice(1));

  try {
    assert.deepEqual(await fs.readFile(photoPath), Buffer.from([0xff, 0xd8, 0xff, 0x00]));
  } finally {
    await removePlayerPhoto(fotoUrl);
  }
  await assert.rejects(fs.access(photoPath), { code: 'ENOENT' });
});

test('player photo storage rejects mismatched image extensions and data URLs', async () => {
  await assert.rejects(savePlayerPhoto({
    originalname: 'portrait.png',
    mimetype: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff])
  }), /imagen JPG, PNG o WebP válida/);
  await assert.rejects(savePlayerPhoto('data:image/jpeg;base64,/9j/'), /foto JPG, PNG o WebP válida/);
});

test('player schema has an optional persistent photo URL', () => {
  const photoPath = Player.schema.path('fotoUrl');
  assert.equal(photoPath.options.type, String);
  assert.equal(photoPath.options.default, '');
  assert.equal(photoPath.options.maxlength, 300);
});
