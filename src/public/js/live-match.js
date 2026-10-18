(function initializeLiveMatchUpdates() {
  const section = document.querySelector('[data-live-section]');
  const list = section?.querySelector('[data-live-matches]');
  if (!section || !list) return;

  const sportNames = {
    futbol: 'Fútbol',
    baloncesto: 'Baloncesto',
    voleibol: 'Voleibol'
  };

  function createTeam(name, logo, grade) {
    const team = document.createElement('div');
    team.className = 'live-match-team';
    if (logo) {
      const crest = document.createElement('img');
      crest.className = 'fixture-team-crest';
      crest.src = logo;
      crest.alt = `Escudo de ${name}`;
      crest.loading = 'lazy';
      team.append(crest);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'fixture-team-crest fixture-team-crest--empty';
      fallback.setAttribute('aria-hidden', 'true');
      fallback.textContent = (name || 'E').slice(0, 1);
      team.append(fallback);
    }

    const teamName = document.createElement('strong');
    teamName.textContent = name;
    team.append(teamName);
    if (grade) {
      const teamGrade = document.createElement('small');
      teamGrade.className = 'fixture-team-grade';
      teamGrade.textContent = grade;
      team.append(teamGrade);
    }
    return team;
  }

  function renderMatches(matches) {
    const cards = matches.map((match) => {
      const card = document.createElement('article');
      card.className = 'live-match-card';
      card.dataset.liveMatchId = match.id;

      const details = document.createElement('span');
      details.className = 'live-match-card__sport';
      details.textContent = `${sportNames[match.deporte] || match.deporte} · ${match.field || 'Cancha por confirmar'}`;

      const scoreboard = document.createElement('div');
      scoreboard.className = 'live-match-card__scoreboard';
      scoreboard.append(createTeam(match.homeTeam, match.homeTeamLogo, match.homeTeamGrade));

      const score = document.createElement('div');
      score.className = 'live-match-score';
      score.setAttribute('aria-label', `Marcador ${match.homeScore} a ${match.awayScore}`);
      const homeScore = document.createElement('strong');
      homeScore.dataset.liveHomeScore = '';
      homeScore.textContent = String(match.homeScore);
      const separator = document.createElement('span');
      separator.textContent = '–';
      const awayScore = document.createElement('strong');
      awayScore.dataset.liveAwayScore = '';
      awayScore.textContent = String(match.awayScore);
      score.append(homeScore, separator, awayScore);

      scoreboard.append(score, createTeam(match.awayTeam, match.awayTeamLogo, match.awayTeamGrade));
      const badge = document.createElement('span');
      badge.className = 'live-match-card__badge';
      const dot = document.createElement('span');
      dot.className = 'live-dot';
      dot.setAttribute('aria-hidden', 'true');
      badge.append(dot, document.createTextNode(' EN VIVO'));
      card.append(details, scoreboard, badge);
      return card;
    });

    list.replaceChildren(...cards);
    section.hidden = matches.length === 0;
  }

  async function refreshLiveMatches() {
    try {
      const response = await fetch('/api/partidos-en-vivo', { headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok || !Array.isArray(result.liveMatches)) {
        throw new Error(result.message || 'No se pudo actualizar el marcador en vivo.');
      }
      renderMatches(result.liveMatches);
    } catch (error) {
      console.error('No se pudo actualizar el partido en vivo:', error);
    }
  }

  window.setInterval(() => {
    if (!document.hidden) refreshLiveMatches();
  }, 15000);
})();
