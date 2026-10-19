const test = require('node:test');
const assert = require('node:assert/strict');
const ejs = require('ejs');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const head = fs.readFileSync(path.join(root, 'src/views/partials/head.ejs'), 'utf8');
const navbar = fs.readFileSync(path.join(root, 'src/views/partials/navbar.ejs'), 'utf8');
const enrollment = fs.readFileSync(path.join(root, 'src/views/pages/enrollment.ejs'), 'utf8');
const modal = fs.readFileSync(path.join(root, 'src/views/partials/privacy-policy-modal.ejs'), 'utf8');
const content = fs.readFileSync(path.join(root, 'src/views/partials/privacy-policy-content.ejs'), 'utf8');
const policyPage = fs.readFileSync(path.join(root, 'src/views/pages/privacy-policy.ejs'), 'utf8');
const home = fs.readFileSync(path.join(root, 'src/views/index.ejs'), 'utf8');
const calendar = fs.readFileSync(path.join(root, 'src/views/pages/calendar.ejs'), 'utf8');
const script = fs.readFileSync(path.join(root, 'src/public/js/enrollment-form.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/public/css/styles.css'), 'utf8');
const controller = require('../src/controllers/home.controller');
const webRoutes = require('../src/routes/web.routes');

test('enrollment privacy link opens a reusable accessible dialog', () => {
  assert.match(enrollment, /<a href="#" id="open-privacy-policy">política de tratamiento de datos<\/a>/);
  assert.doesNotMatch(enrollment, /Consultar política en una ventana/);
  assert.match(enrollment, /<p class="enrollment-privacy">Al enviar esta solicitud[\s\S]*?<\/p>\s*<label class="enrollment-consent">/);
  assert.match(enrollment, /I\.E\. Lucrecio Jaramillo Vélez\./);
  assert.match(enrollment, /include\('\.\.\/partials\/privacy-policy-modal'\)/);
  assert.match(modal, /<dialog[^>]*id="privacy-policy-modal"[^>]*aria-labelledby="privacy-policy-title"/);
  assert.match(modal, /<button[^>]*type="submit"[^>]*aria-label="Cerrar política de tratamiento de datos"/);
  assert.match(script, /privacyLink\.addEventListener\('click'/);
  assert.match(script, /privacyDialog\.showModal\(\)/);
  assert.match(script, /privacyDialog\.close\(\)/);
  assert.match(enrollment, /enrollment-form\.js\?v=privacy-policy-consent-20261019/);
  assert.match(head, /styles\.css\?v=enrollment-submit-style-20261019/);
  assert.match(enrollment, /name="aceptoPoliticaDatos" value="true"[\s\S]*?required/);
  assert.doesNotMatch(enrollment, /href="\/politica-de-datos"/);
});

test('enrollment view renders the link and modal when registration is open', async () => {
  const html = await ejs.renderFile(path.join(root, 'src/views/pages/enrollment.ejs'), {
    title: 'Inscripciones',
    user: null,
    success: false,
    error: '',
    inscripcionesAbiertas: true,
    activeSports: [{ id: 'futbol', name: 'Fútbol' }],
    categories: ['Junior'],
    formData: {},
  });

  assert.match(html, /id="open-privacy-policy"/);
  assert.match(html, /id="privacy-policy-modal"/);
  assert.match(html, /name="aceptoPoliticaDatos"[^>]*required/);
  assert.match(html, /Acepto la <a href="#" id="open-privacy-policy">política de tratamiento de datos<\/a> de la I\.E\. Lucrecio Jaramillo Vélez\./);
  assert.match(html, /Política de Tratamiento y Protección de Datos Personales \(Provisional\)/);
});

test('policy dialog presents all six sections and the supplied personal-data policy', () => {
  for (const section of [
    'Responsable del Tratamiento',
    'Datos Recopilados',
    'Finalidad',
    'Uso de Imágenes',
    'Derechos de los Usuarios (Habeas Data)',
    'Carácter Provisional',
  ]) {
    assert.ok(content.includes(section), `missing policy section: ${section}`);
  }
  assert.match(content, /Cra 79 #38-59, Laureles - Estadio, Medellín/);
  assert.match(content, /solicitar la eliminación de sus datos personales/);
  assert.match(content, /galería del sitio web/);
  assert.match(modal, /include\('privacy-policy-content'\)/);
  assert.match(policyPage, /include\('\.\.\/partials\/privacy-policy-content'\)/);
});

test('dedicated policy page is public, linked from site navigation, and renders the shared policy', async () => {
  const route = webRoutes.stack.find((entry) => entry.route?.path === '/politica-de-datos' && entry.route.methods.get);
  assert.ok(route);
  assert.deepEqual(route.route.stack.map((handler) => handler.handle), [controller.showPrivacyPolicy]);
  assert.doesNotMatch(navbar, /href="\/politica-de-datos"/);
  assert.match(home, /href="\/politica-de-datos">Política de tratamiento de datos/);
  assert.match(calendar, /href="\/politica-de-datos">Política de tratamiento de datos/);

  let rendered;
  controller.showPrivacyPolicy({ session: null }, {
    render: (view, data) => { rendered = { view, data }; }
  });
  assert.equal(rendered.view, 'pages/privacy-policy');
  assert.equal(rendered.data.user, null);

  const html = await ejs.renderFile(path.join(root, 'src/views/pages/privacy-policy.ejs'), {
    title: rendered.data.title,
    user: null
  });
  assert.match(html, /Política de Tratamiento y Protección de Datos Personales \(Provisional\)/);
  assert.match(html, /Habeas Data/);
});

test('privacy link and dialog define readable light, dark, and system theme colors', () => {
  assert.match(styles, /\.enrollment-privacy a\s*\{[^}]*color:\s*#166534/);
  assert.match(styles, /body\.dark-mode \.enrollment-privacy a\s*\{[^}]*color:\s*#86EFAC/);
  assert.match(styles, /\.enrollment-submit\s*\{[^}]*justify-self:\s*center/);
  assert.match(styles, /\.enrollment-submit\s*\{[^}]*border-radius:\s*12px/);
  assert.match(styles, /\.enrollment-submit\s*\{[^}]*color:\s*#FFFFFF/);
  assert.match(styles, /\.enrollment-submit:focus-visible\s*\{[^}]*outline:\s*3px solid #86EFAC/);
  assert.match(styles, /\.enrollment-consent\s*\{[^}]*color:\s*#475569/);
  assert.match(styles, /body\.enrollment-page\[data-theme="dark"\] \.privacy-policy-modal[\s\S]*?--privacy-surface:\s*#1E293B/);
  assert.match(styles, /@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?\.privacy-policy-modal\s*\{[\s\S]*?--privacy-surface:\s*#1E293B/);
  assert.match(styles, /\.privacy-policy-page\s*\{[\s\S]*?--privacy-surface:\s*#FFFFFF/);
  assert.match(styles, /body\.privacy-policy-page\[data-theme="dark"\]\s*\{[^}]*--privacy-surface:\s*#1E293B/);
  assert.match(styles, /body\.privacy-policy-page:not\(\.dark-mode\):not\(\.light-mode\):not\(\[data-theme="light"\]\)\s*\{[^}]*--privacy-surface:\s*#1E293B/);
});
