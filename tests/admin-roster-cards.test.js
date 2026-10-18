const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'src/views/admin/dashboard.ejs'), 'utf8');
const script = fs.readFileSync(path.join(root, 'src/public/js/admin-dashboard.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/public/css/styles.css'), 'utf8');

test('admin roster uses a compact table with small centered photo avatars', () => {
  assert.match(template, /class="admin-roster-table"/);
  assert.match(template, /class="admin-player-avatar"/);
  assert.match(template, /class="admin-roster-table">[\s\S]*?<th scope="col">Jugador<\/th>[\s\S]*?<th scope="col">Grado \/ sección<\/th>[\s\S]*?<th scope="col">Posición<\/th>[\s\S]*?<th scope="col">Camiseta<\/th>[\s\S]*?<th scope="col">Goles<\/th>[\s\S]*?<th scope="col">Acciones<\/th>/);
  assert.match(styles, /\.admin-roster-table td\s*\{[^}]*padding:\s*4px 8px;/);
  assert.match(styles, /\.admin-player-avatar\s*\{[^}]*flex:\s*0 0 40px;[^}]*height:\s*40px;[^}]*width:\s*40px;/);
  assert.match(styles, /\.admin-player-avatar img\s*\{[^}]*object-fit:\s*cover;/);
  assert.doesNotMatch(template, /admin-roster-grid|admin-roster-player-card/);
});

test('admin roster table retains editable stats, player management, search, and batch save', () => {
  for (const marker of [
    'data-roster-number',
    'data-roster-goals',
    'data-modal-open="player-editor-modal"',
    'data-roster-search',
    'data-roster-feedback',
    'data-save-roster'
  ]) {
    assert.ok(template.includes(marker), `expected dashboard markup marker ${marker}`);
  }
  assert.match(template, /aria-label="Buscar jugadores de <%= equipo\.nombre %>"/);
  assert.match(script, /querySelectorAll\('\[data-roster-player\]'\)/);
  assert.match(script, /\/admin\/jugadores\/actualizacion-lote/);
  assert.match(template, /action="\/admin\/jugadores\/<%= jugador\.id %>\/eliminar"/);
});

test('admin player actions use accessible compact SVG edit and delete icons', () => {
  assert.match(template, /aria-label="Editar jugador" title="Editar jugador">[\s\S]*?<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 5/);
  assert.match(template, /aria-label="Eliminar jugador" title="Eliminar jugador">[\s\S]*?<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16/);
  assert.doesNotMatch(template, /aria-label="Editar jugador" title="Editar jugador">Editar</);
  assert.doesNotMatch(template, /aria-label="Eliminar jugador" title="Eliminar jugador">Eliminar</);
  assert.match(styles, /\.admin-roster-table \.admin-player-actions\s*\{\s*gap:\s*\.5rem;/);
  assert.match(styles, /\.admin-roster-table \.admin-player-actions \.icon-action svg\s*\{\s*height:\s*18px;[^}]*width:\s*18px;/);
  assert.match(styles, /\.admin-roster-table \.admin-player-actions \.icon-action:hover,[\s\S]*?color:\s*#059669;/);
  assert.match(styles, /\.admin-roster-table \.admin-player-actions \.icon-action--danger:hover,[\s\S]*?color:\s*#DC2626;/);
  assert.match(script, /aria-label="Editar jugador" title="Editar jugador"><svg viewBox="0 0 24 24"/);
  assert.match(script, /aria-label="Eliminar jugador" title="Eliminar jugador"><svg viewBox="0 0 24 24"/);
  assert.doesNotMatch(script, /aria-label="Editar jugador" title="Editar jugador">Editar/);
  assert.doesNotMatch(script, /aria-label="Eliminar jugador" title="Eliminar jugador">Eliminar/);
  assert.match(template, /admin-dashboard\.js\?v=ajax-dashboard-20261018/);
});

test('admin dashboard saves forms without reloading and refreshes tournament data in place', () => {
  assert.doesNotMatch(script, /location\.reload\s*\(/);
  assert.match(script, /fetch\(form\.action,\s*\{\s*method:\s*'POST'/);
  assert.match(script, /admin:refresh-scope/);
  assert.match(script, /loadScope\(\{ updateUrl: false \}\)/);
  assert.match(script, /data-admin-ajax-notification/);
  assert.match(script, /window\.scrollTo\(0, scrollPosition\)/);
});
