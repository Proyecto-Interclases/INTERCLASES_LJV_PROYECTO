const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const styles = fs.readFileSync(path.join(root, 'src/public/css/styles.css'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/views/admin/dashboard.ejs'), 'utf8');

test('match crests use the transparent appearance of the team tab', () => {
  const crestStyles = styles.match(/\.fixture-team-crest\s*\{([^}]+)\}/)?.[1] || '';

  assert.match(crestStyles, /background:\s*transparent;/);
  assert.match(crestStyles, /border:\s*0;/);
  assert.match(crestStyles, /border-radius:\s*0;/);
  assert.match(crestStyles, /padding:\s*0;/);
  assert.match(crestStyles, /filter:\s*drop-shadow\(0 0 6px rgba\(148, 163, 184, \.55\)\);/);
});

test('admin dashboard displays the institutional logo at its natural proportions', () => {
  assert.match(dashboard, /class="institution-crest institutional-shield dashboard-brand__logo"[\s\S]*?src="\/images\/logo-ljv\.png"/);
  assert.match(styles, /\.dashboard-brand__logo\s*\{[^}]*object-fit:\s*contain;[^}]*width:\s*64px;/);
});
