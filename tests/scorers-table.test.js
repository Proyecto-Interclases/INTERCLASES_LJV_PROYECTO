const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'src/views/pages/teams.ejs'), 'utf8');
const head = fs.readFileSync(path.join(root, 'src/views/partials/head.ejs'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/public/css/styles.css'), 'utf8');
const tournamentService = fs.readFileSync(path.join(root, 'src/services/tournament.service.js'), 'utf8');

test('scorers table displays rank, player thumbnail and grade, team crest, and centered goals', () => {
  assert.match(template, /class="sports-table-wrap table-responsive">[\s\S]*?<table class="sports-table scorers-table">/);
  for (const column of ['col-rank', 'col-player', 'col-team', 'col-goals']) {
    assert.match(template, new RegExp(`class="${column}" scope="col"`));
  }
  assert.match(template, /class="col-rank standings-rank"><strong><%= String\(index \+ 1\)\.padStart\(2, '0'\) %><\/strong>/);
  assert.match(template, /class="mini-card-thumb">[\s\S]*?player\.fotoUrl[\s\S]*?class="player-info-text"[\s\S]*?class="p-grade"><%= player\.grado %>/);
  assert.match(template, /class="team-logo-sm"/);
  assert.match(template, /class="col-goals"><span class="goal-badge"><%= player\.goles %><\/span>/);
  assert.doesNotMatch(template, /class="scorer-number"/);
});

test('scorers table uses the existing managed photo URL and team crest fields', () => {
  assert.match(tournamentService, /fotoUrl:\s*isManagedPlayerPhotoUrl\(player\.fotoUrl\)\s*\?\s*player\.fotoUrl\s*:\s*''/);
  assert.match(tournamentService, /escudoUrl:\s*player\.equipo_id\s*\?\s*getTeamCrestUrl\(player\.equipo_id\.escudoUrl\)\s*:\s*''/);
  assert.match(template, /src="<%= player\.escudoUrl %>"/);
  assert.match(template, /<span><%= player\.equipo %><\/span>/);
});

test('scorers table has compact aligned mini cards and centered goal styling', () => {
  assert.match(styles, /\.teams-page \.scorers-table th\.col-goals,[\s\S]*?\.teams-page \.scorers-table td\.col-goals \{\s*text-align:\s*center;/);
  assert.match(styles, /\.mini-card-thumb\s*\{[\s\S]*?width:\s*46px;[\s\S]*?height:\s*64px;[\s\S]*?clip-path:\s*polygon/);
  assert.match(styles, /\.mini-card-thumb img\s*\{[^}]*object-fit:\s*contain;[^}]*object-position:\s*center 18%;/);
  assert.match(styles, /\.team-cell-content\s*\{\s*align-items:\s*center;[^}]*display:\s*flex;[^}]*gap:\s*10px;/);
  assert.match(styles, /\.team-logo-sm\s*\{[^}]*filter:\s*drop-shadow\(0 2px 4px rgba\(0, 0, 0, \.3\)\);[^}]*height:\s*30px;[^}]*object-fit:\s*contain;[^}]*width:\s*30px;/);
  assert.match(styles, /\.teams-page \.scorers-section \.mini-card-thumb\s*\{[^}]*filter:\s*drop-shadow\(0 4px 7px rgba\(0, 0, 0, \.32\)\);[^}]*flex-basis:\s*56px;[^}]*height:\s*78px;[^}]*width:\s*56px;/);
  assert.match(styles, /\.teams-page \.scorers-section \.mini-card-thumb img\s*\{[^}]*height:\s*68px;[^}]*object-fit:\s*cover;[^}]*object-position:\s*center 20%;[^}]*width:\s*50px;/);
  assert.match(styles, /\.teams-page \.scorers-section \.team-logo-sm\s*\{[^}]*filter:\s*drop-shadow\(0 3px 6px rgba\(0, 0, 0, \.42\)\);[^}]*flex-basis:\s*56px;[^}]*height:\s*56px;[^}]*width:\s*56px;/);
  assert.match(styles, /\.teams-page \.scorers-table th\.col-goals,[\s\S]*?\.teams-page \.scorers-table td\.col-goals \{\s*text-align:\s*center;/);
  assert.match(styles, /\.teams-page \.scorers-table \.goal-badge\s*\{[^}]*text-align:\s*center;/);
  assert.match(styles, /\.teams-page \.scorers-table th,[\s\S]*?padding:\s*12px 16px;/);
  assert.match(styles, /\.teams-page \.scorers-section \.scorers-table th,[\s\S]*?padding-bottom:\s*14px;[^}]*padding-top:\s*14px;/);
});

test('team roster page EJS compiles after scorer table changes', () => {
  assert.doesNotThrow(() => ejs.compile(template));
  assert.match(head, /styles\.css\?v=enrollment-submit-style-20261019/);
});
