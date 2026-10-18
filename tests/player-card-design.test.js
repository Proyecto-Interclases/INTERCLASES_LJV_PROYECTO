const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const partialPath = path.join(root, 'src/views/partials/player-card.ejs');
const partial = fs.readFileSync(partialPath, 'utf8');
const rosterScript = fs.readFileSync(path.join(root, 'src/public/js/fifa-roster.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/views/admin/dashboard.ejs'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/public/css/styles.css'), 'utf8');

test('shared player card partial renders shield photo and three-stat layout', () => {
  const html = ejs.render(partial, {
    player: {
      nombre: 'Ana Sofia Alzate',
      numero_camiseta: 10,
      posicion: 'Delantera',
      goles: 2,
      asistencias: 1,
      atajadas: 0,
      fotoUrl: '/uploads/jugadores/ana.png'
    },
    compact: false,
    topTeamGoals: 2
  });

  assert.match(html, /class="fifa-card[^"]*"/);
  assert.match(html, /class="fifa-card__shape"/);
  assert.match(html, /class="fifa-card__info"/);
  assert.match(html, /class="fifa-card__photo" src="\/uploads\/jugadores\/ana\.png"/);
  assert.match(html, /class="fifa-card__name">Alzate<\/div>/);
  assert.match(html, /<span><b>2<\/b><span>GOL<\/span><\/span>/);
  assert.match(html, /<span><b>1<\/b><span>AST<\/span><\/span>/);
  assert.match(html, /<span><b>0<\/b><span>ATA<\/span><\/span>/);
});

test('football lineup renderer creates the shared shield card structure with safe DOM text', () => {
  for (const className of [
    'fifa-card__shape',
    'fifa-card__info',
    'fifa-card__num',
    'fifa-card__position',
    'fifa-card__photo',
    'fifa-card__name',
    'fifa-card__stats'
  ]) {
    assert.ok(rosterScript.includes(className), `expected lineup card class ${className}`);
  }
  assert.match(rosterScript, /name\.textContent\s*=/);
  assert.match(rosterScript, /createStat\('GOL'/);
  assert.match(rosterScript, /createStat\('AST'/);
  assert.match(rosterScript, /createStat\('ATA'/);
  assert.match(dashboard, /class="fifa-card__shape"/);
  assert.match(dashboard, /class="fifa-card__photo" data-preview-photo/);
});

test('shield design styles support theme variables, unframed player photos, and responsive cards', () => {
  assert.match(styles, /--card-glow:\s*rgba\(61, 220, 132, \.22\)/);
  assert.match(styles, /\.teams-page\.dark-mode,[\s\S]*?--card-1:\s*#4a4f52/);
  assert.match(styles, /\.teams-page\[data-theme="light"\]/);
  assert.match(styles, /\.teams-page \.fifa-card__photo,[\s\S]*?object-fit:\s*contain/);
  assert.match(styles, /clip-path:\s*polygon\(9% 0, 91% 0, 100% 7%/);
  assert.match(styles, /@media \(max-width: 440px\)[\s\S]*?\.teams-page \.fifa-card__photo/);
});
