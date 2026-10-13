const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeAnnouncementHtml } = require('../src/services/admin.service');
const { validateImageBuffer } = require('../src/services/image-validation.service');

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
