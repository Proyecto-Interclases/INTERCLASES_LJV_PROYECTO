const test = require('node:test');
const assert = require('node:assert/strict');
const ejs = require('ejs');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function getFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? getFiles(entryPath) : [entryPath];
  });
}

test('views and public scripts do not use emoji characters in the interface', () => {
  const interfaceFiles = [
    ...getFiles(path.join(root, 'src/views')),
    ...getFiles(path.join(root, 'src/public/js')),
  ];
  const emojiPattern = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;

  for (const filePath of interfaceFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(content, emojiPattern, path.relative(root, filePath));
  }
});

test('sports and result graphics use the shared vector icon partial', () => {
  const iconPartial = fs.readFileSync(path.join(root, 'src/views/partials/ui-icon.ejs'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'src/views/index.ejs'), 'utf8');
  const calendar = fs.readFileSync(path.join(root, 'src/views/pages/calendar.ejs'), 'utf8');
  const enrollment = fs.readFileSync(path.join(root, 'src/views/pages/enrollment.ejs'), 'utf8');

  for (const iconName of ['futbol', 'baloncesto', 'voleibol', 'trophy', 'draw']) {
    assert.ok(iconPartial.includes(`name === '${iconName}'`), `missing ${iconName} SVG`);
  }
  assert.match(home, /include\('partials\/ui-icon'/);
  assert.match(calendar, /include\('\.\.\/partials\/ui-icon'/);
  assert.match(enrollment, /include\('\.\.\/partials\/ui-icon'/);
  assert.match(enrollment, /class="enrollment-sport__icon"[\s\S]*?className: 'ui-icon--sport'/);
});

test('shared SVG partial renders each supported icon', async () => {
  const iconPath = path.join(root, 'src/views/partials/ui-icon.ejs');

  for (const name of ['futbol', 'baloncesto', 'voleibol', 'trophy', 'draw', 'check']) {
    const svg = await ejs.renderFile(iconPath, { name });
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /<\/svg>\s*$/);
    assert.match(svg, /(?:fill|stroke)="#[0-9A-Fa-f]{6}"/);
  }
});

test('football icon uses a symmetric central pentagon and clipped geometric panels', async () => {
  const svg = await ejs.renderFile(path.join(root, 'src/views/partials/ui-icon.ejs'), { name: 'futbol' });
  const center = svg.match(/<polygon points="([^"]+)"[^>]*><\/polygon>/)?.[1];

  assert.ok(center, 'football SVG should include a central pentagon');
  assert.equal(center.split(/\s+/).length, 5);
  assert.match(svg, /viewBox="0 0 200 200"/);
  assert.match(svg, /<clipPath id="football-ball-clip">/);
  assert.match(svg, /<use href="#football-outer-panel" transform="rotate\(288 100 100\)">/);
});

test('basketball and volleyball enrollment icons render their colored ball designs at matching proportions', async () => {
  const iconPath = path.join(root, 'src/views/partials/ui-icon.ejs');

  const basketball = await ejs.renderFile(iconPath, { name: 'baloncesto', className: 'ui-icon--sport' });
  const volleyball = await ejs.renderFile(iconPath, { name: 'voleibol', className: 'ui-icon--sport' });

  for (const svg of [basketball, volleyball]) {
    assert.match(svg, /viewBox="0 0 200 200"/);
    assert.match(svg, /class="ui-icon ui-icon--(?:baloncesto|voleibol) ui-icon--sport"/);
    assert.match(svg, /<circle cx="100" cy="100" r="92"/);
  }
  assert.match(basketball, /fill="#E8742A"/);
  assert.match(basketball, /M34 28Q84 100 34 172/);
  assert.match(volleyball, /fill="#F6E27A"/);
  assert.match(volleyball, /rotate\(240 100 100\)/);
});
