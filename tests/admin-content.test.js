const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeAnnouncementHtml } = require('../src/services/admin.service');
const { validateImageBuffer } = require('../src/services/image-validation.service');
const { normalizeCategoryFilter, buildAdminStandings } = require('../src/controllers/admin.controller');

test('admin standings category filter treats blank and all-category aliases as unfiltered', () => {
  assert.equal(normalizeCategoryFilter(''), '');
  assert.equal(normalizeCategoryFilter('all'), '');
  assert.equal(normalizeCategoryFilter('todas'), '');
  assert.equal(normalizeCategoryFilter(' Categoría A '), 'Categoría A');
});

test('admin standings preserve all teams and assign ranks independently per category', () => {
  const categoryA = Array.from({ length: 9 }, (_, index) => ({
    id: `team-a-${index + 1}`,
    name: `Equipo A${index + 1}`,
    category: 'Categoría A'
  }));
  const categoryB = Array.from({ length: 7 }, (_, index) => ({
    id: `team-b-${index + 1}`,
    name: `Equipo B${index + 1}`,
    category: 'Categoría B'
  }));
  const result = buildAdminStandings([categoryA, categoryB], 'futbol');

  assert.equal(result.length, 16);
  assert.equal(result[0].rank, 1);
  assert.equal(result[8].rank, 9);
  assert.equal(result[9].rank, 1);
  assert.equal(result[15].rank, 7);
  assert.ok(result.every((team) => team.deporte === 'futbol'));
});

test('announcement rich text keeps a small safe formatting allowlist', () => {
  const sanitized = sanitizeAnnouncementHtml(
    '<h2>Final</h2><p>Este <strong>viernes</strong></p><script>alert(1)</script><img src=x onerror=alert(2)>'
  );

  assert.equal(sanitized, '<h2>Final</h2><p>Este <strong>viernes</strong></p>');
});

test('announcement links discard unsafe protocols and event attributes', () => {
  const sanitized = sanitizeAnnouncementHtml(
    '<a href="javascript:alert(1)" onclick="alert(2)">malicioso</a><a href="javascript&#58;alert(3)">codificado</a><a href="https://example.org" onclick="alert(4)">sitio</a>'
  );

  assert.equal(
    sanitized,
    '<a>malicioso</a><a>codificado</a><a href="https://example.org" rel="nofollow noopener noreferrer">sitio</a>'
  );
});

test('announcement rich text enforces a maximum input length', () => {
  assert.throws(() => sanitizeAnnouncementHtml('x'.repeat(5001)), /5000 caracteres/);
});

test('image validation checks both the declared type and the binary signature', () => {
  assert.doesNotThrow(() => validateImageBuffer({
    originalname: 'foto.png',
    mimetype: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  }, 'La imagen'));

  assert.throws(() => validateImageBuffer({
    originalname: 'foto.png',
    mimetype: 'image/png',
    buffer: Buffer.from('not an image')
  }, 'La imagen'), /imagen JPG, PNG o WebP válida/);

  assert.throws(() => validateImageBuffer({
    originalname: 'foto.jpg',
    mimetype: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  }, 'La imagen'), /imagen JPG, PNG o WebP válida/);
});
