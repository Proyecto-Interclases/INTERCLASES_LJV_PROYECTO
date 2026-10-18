const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const Match = require('../src/models/Match');
const { getHomeMatchSections } = require('../src/services/tournament.service');

const root = path.join(__dirname, '..');
const homeTemplate = fs.readFileSync(path.join(root, 'src/views/index.ejs'), 'utf8');
const adminTemplate = fs.readFileSync(path.join(root, 'src/views/admin/dashboard.ejs'), 'utf8');
const liveScript = fs.readFileSync(path.join(root, 'src/public/js/live-match.js'), 'utf8');
const webRoutes = fs.readFileSync(path.join(root, 'src/routes/web.routes.js'), 'utf8');
const matchIndexes = Match.schema.indexes();

test('home sections are ordered live, recent results, gallery, and enrollment', () => {
  assert.doesNotThrow(() => ejs.compile(homeTemplate));
  assert.doesNotThrow(() => ejs.compile(adminTemplate));
  const sectionOrder = [
    homeTemplate.indexOf('data-live-section'),
    homeTemplate.indexOf('id="match-carousel"'),
    homeTemplate.indexOf('class="gallery-hero"'),
    homeTemplate.indexOf('aria-labelledby="home-sports-title"')
  ];
  assert.ok(sectionOrder.every((position) => position >= 0));
  assert.deepEqual(sectionOrder, [...sectionOrder].sort((first, second) => first - second));
  assert.match(homeTemplate, /liveMatches\.length \? '' : 'hidden'/);
});

test('home carousel uses the three most recent finished matches only', () => {
  assert.match(homeTemplate, /id="match-carousel-title">Últimos partidos/);
  assert.match(homeTemplate, /latestMatches\.forEach/);
  assert.match(homeTemplate, /Aún no hay partidos finalizados/);
  assert.match(getHomeMatchSections.toString(), /\.slice\(0,\s*3\)/);
});

test('live match scores can be polled publicly and only one game per sport is indexed as live', () => {
  assert.match(webRoutes, /get\('\/api\/partidos-en-vivo', homeController\.getLiveMatches\)/);
  assert.match(liveScript, /setInterval/);
  assert.ok(matchIndexes.some(([keys, options]) => (
    keys.deporte === 1
    && options.unique
    && options.partialFilterExpression?.estado === 'Jugando'
  )));
});
