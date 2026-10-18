const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const styles = fs.readFileSync(path.join(root, 'src/public/css/styles.css'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/views/admin/dashboard.ejs'), 'utf8');
const navbar = fs.readFileSync(path.join(root, 'src/views/partials/navbar.ejs'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'src/public/js/navigation.js'), 'utf8');

test('match crests use the transparent appearance of the team tab', () => {
  const crestStyles = styles.match(/\.fixture-team-crest\s*\{([^}]+)\}/)?.[1] || '';

  assert.match(crestStyles, /background:\s*transparent;/);
  assert.match(crestStyles, /border:\s*0;/);
  assert.match(crestStyles, /border-radius:\s*0;/);
  assert.match(crestStyles, /padding:\s*0;/);
  assert.match(crestStyles, /filter:\s*drop-shadow\(0 0 6px rgba\(148, 163, 184, \.55\)\);/);
});

test('admin dashboard displays the institutional logo at its natural proportions', () => {
  assert.match(dashboard, /include\('\.\.\/partials\/navbar',\s*\{\s*user\s*\}\)/);
  assert.match(navbar, /class="site-logo institutional-shield"[\s\S]*?src="\/images\/logo-ljv\.png"/);
  assert.match(styles, /\.site-logo\s*\{[^}]*object-fit:\s*contain;[^}]*width:\s*64px;/);
});

test('admin dashboard uses the shared aligned navigation and truncates long profile names', () => {
  assert.match(dashboard, /class="dashboard-page-heading"/);
  assert.doesNotMatch(dashboard, /dashboard-profile-menu/);
  assert.match(styles, /\.profile-trigger \.profile-name--full\s*\{\s*max-width:\s*175px;/);
  assert.match(styles, /@media \(min-width: 1024px\)\s*\{[\s\S]*?grid-template-areas:\s*"brand actions" "links links";[\s\S]*?\.nav-menu\s*\{[^}]*display:\s*contents;[^}]*\}[\s\S]*?\.nav-links\s*\{[^}]*flex-wrap:\s*wrap;/);
  assert.match(styles, /@media \(min-width: 1440px\)\s*\{[\s\S]*?grid-template-areas:\s*"brand links actions";[\s\S]*?\.nav-links\s*\{[^}]*flex-wrap:\s*nowrap;/);
  assert.match(navigation, /window\.innerWidth >= 1024/);
});
