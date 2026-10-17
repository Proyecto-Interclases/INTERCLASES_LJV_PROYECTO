(function initializeAdminDashboard() {
  const navigation = document.querySelector('.admin-section-nav');
  const mobileNavigationToggle = document.querySelector('.admin-navigation-toggle');

  if (!navigation) return;

  const tabs = Array.from(navigation.querySelectorAll('[data-admin-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-admin-panel]'));
  const sportScope = document.querySelector('[data-admin-sport-scope]');
  const mobileNavigation = window.matchMedia('(max-width: 760px)');

  if (!tabs.length || !panels.length) return;

  function setMobileNavigationExpanded(expanded) {
    const isMobile = mobileNavigation.matches;
    const isExpanded = isMobile && expanded;

    if (mobileNavigationToggle) {
      mobileNavigationToggle.hidden = !isMobile;
      mobileNavigationToggle.setAttribute('aria-expanded', String(isExpanded));
      mobileNavigationToggle.setAttribute(
        'aria-label',
        isExpanded ? 'Ocultar secciones de administración' : 'Mostrar secciones de administración'
      );
    }

    navigation.hidden = isMobile && !isExpanded;
    navigation.setAttribute('aria-hidden', String(isMobile && !isExpanded));
    navigation.closest('.dashboard-sidebar')?.classList.toggle('is-navigation-open', isExpanded);

    if (isMobile && !isExpanded && navigation.contains(document.activeElement)) {
      mobileNavigationToggle?.focus();
    }
  }

  setMobileNavigationExpanded(false);
  mobileNavigationToggle?.addEventListener('click', () => {
    const isExpanded = mobileNavigationToggle.getAttribute('aria-expanded') === 'true';
    setMobileNavigationExpanded(!isExpanded);
  });
  mobileNavigation.addEventListener('change', () => setMobileNavigationExpanded(false));

  const validSections = new Set(tabs.map((tab) => tab.dataset.adminTab));
  let savedSection = null;

  function syncNavigationOrientation() {
    navigation.setAttribute('aria-orientation', mobileNavigation.matches ? 'horizontal' : 'vertical');
  }

  syncNavigationOrientation();
  mobileNavigation.addEventListener('change', syncNavigationOrientation);

  try {
    savedSection = sessionStorage.getItem('admin-active-section');
  } catch (error) {
    savedSection = null;
  }

  function activateSection(section, { focus = false, remember = true } = {}) {
    const activeTab = tabs.find((tab) => tab.dataset.adminTab === section);
    if (!activeTab) return;

    tabs.forEach((tab) => {
      const isActive = tab === activeTab;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== section;
    });
    if (sportScope) {
      sportScope.hidden = panels.some((panel) => (
        panel.dataset.adminPanel === section && panel.dataset.adminGlobal === 'true'
      ));
    }

    const activeSectionLabel = mobileNavigationToggle?.querySelector('[data-active-admin-section]');
    if (activeSectionLabel) activeSectionLabel.textContent = activeTab.textContent.trim();
    setMobileNavigationExpanded(focus);

    if (remember) {
      try {
        sessionStorage.setItem('admin-active-section', section);
      } catch (error) {
        // The tabs still work when browser storage is unavailable.
      }
    }

    if (focus) activeTab.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateSection(tab.dataset.adminTab));

    tab.addEventListener('keydown', (event) => {
      const horizontal = mobileNavigation.matches;
      const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
      const previousKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
      let nextIndex = index;

      if (event.key === nextKey) nextIndex = (index + 1) % tabs.length;
      else if (event.key === previousKey) nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      activateSection(tabs[nextIndex].dataset.adminTab, { focus: true });
    });
  });

  activateSection(validSections.has(savedSection) ? savedSection : 'teams', { remember: false });
})();

(function initializeAdminModals() {
  document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-modal-open]');
      if (!trigger) return;
      const modal = document.getElementById(trigger.dataset.modalOpen);
      if (!modal) return;

      if (modal.id === 'player-editor-modal') {
        const playerForm = modal.querySelector('#player-editor-form');
        const playerId = trigger.dataset.playerId || '';
        const playerName = trigger.dataset.playerName || '';
        const teamName = trigger.dataset.teamName || '';

        playerForm.action = playerId
          ? `/admin/jugadores/${encodeURIComponent(playerId)}/editar`
          : '/admin/jugadores';
        modal.querySelector('#player-editor-title').textContent = playerId ? 'Editar jugador' : 'Agregar jugador';
        modal.querySelector('#player-editor-team').textContent = teamName ? `PLANTILLA · ${teamName}` : 'PLANTILLA';
        modal.querySelector('#player-editor-submit').textContent = playerId ? 'Guardar cambios' : 'Agregar jugador';
        modal.querySelector('#player-editor-name').setAttribute('autocomplete', 'off');
        modal.querySelector('#player-editor-team-id').value = trigger.dataset.teamId || '';
        modal.querySelector('#player-editor-name').value = playerName;
        modal.querySelector('#player-editor-grade').value = trigger.dataset.playerGrade || '';
        modal.querySelector('#player-editor-number').value = trigger.dataset.playerNumber || '0';
        modal.querySelector('#player-editor-position').value = trigger.dataset.playerPosition || '';
        modal.querySelector('#player-editor-goals').value = trigger.dataset.playerGoals || '0';
      }

      if (modal.id === 'team-editor-modal') {
        const teamForm = modal.querySelector('#team-editor-form');
        teamForm.action = `/admin/equipos/${encodeURIComponent(trigger.dataset.teamId || '')}/editar`;
        modal.querySelector('#team-editor-name').value = trigger.dataset.teamName || '';
        modal.querySelector('#team-editor-category').value = trigger.dataset.teamCategory || '';
        modal.querySelector('#team-editor-sport').value = trigger.dataset.teamSport || 'futbol';
        modal.querySelector('#team-editor-shield').value = '';
        const crestPreview = modal.querySelector('#team-editor-crest-preview');
        crestPreview.src = trigger.dataset.teamCrest || '';
        crestPreview.alt = `Bandera de ${trigger.dataset.teamName || 'equipo'}`;
        crestPreview.hidden = !trigger.dataset.teamCrest;
      }

      if (modal.id === 'match-editor-modal') {
        const matchForm = modal.querySelector('#match-editor-form');
        const matchId = trigger.dataset.matchId || '';
        matchForm.action = matchId
          ? `/admin/partidos/${encodeURIComponent(matchId)}/editar`
          : '/admin/partidos';
        matchForm.reset();
        modal.querySelector('#match-editor-title').textContent = matchId ? 'Editar partido' : 'Programar partido';
        modal.querySelector('#match-editor-home').value = trigger.dataset.matchHomeId || '';
        modal.querySelector('#match-editor-away').value = trigger.dataset.matchAwayId || '';
        modal.querySelector('#match-editor-date').value = trigger.dataset.matchDate || '';
        modal.querySelector('#match-editor-time').value = trigger.dataset.matchTime || '';
        modal.querySelector('#match-editor-venue').value = trigger.dataset.matchVenue || '';
        modal.querySelector('#match-editor-status').value = trigger.dataset.matchStatus || 'Por jugar';
      }

      if (modal.id === 'captain-editor-modal') {
        const teamId = trigger.dataset.teamId || '';
        const teamName = trigger.dataset.teamName || '';
        const currentCaptain = trigger.dataset.captainEmail || '';
        const captainForm = modal.querySelector('#captain-editor-form');
        const captainSelect = modal.querySelector('#captain-editor-select');

        captainForm.action = `/admin/equipos/${encodeURIComponent(teamId)}/capitan`;
        modal.querySelector('#captain-editor-team').textContent = `EQUIPO · ${teamName}`;
        modal.querySelector('#captain-editor-title').textContent = currentCaptain ? 'Cambiar capitán' : 'Asignar capitán';

        Array.from(captainSelect.options).forEach((option) => {
          const assignedTeam = option.dataset.assignedTeam || '';
          option.disabled = Boolean(assignedTeam && assignedTeam !== teamName);
        });
        captainSelect.value = currentCaptain;
      }

      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
      modal.querySelector('input:not([type="hidden"])')?.focus();
  });

  document.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });

  document.querySelectorAll('.admin-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.close();
    });
  });
})();

(function initializeAdminFilters() {
  const sportChoices = Array.from(document.querySelectorAll('[data-admin-sport-choice]'));
  const categoryFilter = document.querySelector('[data-admin-category-filter]');
  const status = document.querySelector('[data-admin-scope-status]');
  const errorBox = document.querySelector('[data-admin-scope-error]');
  const teamList = document.querySelector('#equipos .result-list.dashboard-list');
  const matchList = document.querySelector('[data-admin-panel="matches"] .result-list.dashboard-list');
  const standingsBody = document.querySelector('.standings-table tbody');
  const requests = Array.from(document.querySelectorAll('.enrollment-request-card'));
  const matchModal = document.querySelector('#match-editor-modal');
  const matchHome = matchModal?.querySelector('#match-editor-home');
  const matchAway = matchModal?.querySelector('#match-editor-away');
  const params = new URLSearchParams(window.location.search);
  const validSports = new Set(sportChoices.map((choice) => choice.dataset.adminSportChoice));
  const validCategories = new Set(Array.from(categoryFilter?.options || []).map((option) => option.value));
  let currentSport = validSports.has(params.get('deporte')) ? params.get('deporte') : 'futbol';
  const requestedCategory = params.get('categoria') || '';
  const needsUrlNormalization = !validSports.has(params.get('deporte'))
    || (requestedCategory && !validCategories.has(requestedCategory));
  let requestController;

  if (categoryFilter) categoryFilter.value = validCategories.has(requestedCategory) ? requestedCategory : '';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const sportName = (id) => sportChoices.find((choice) => choice.dataset.adminSportChoice === id)?.querySelector('span')?.textContent || 'Fútbol';
  const setStatus = (message) => { if (status) status.textContent = message; };

  function renderTeams(teams) {
    if (!teamList) return;
    if (!teams.length) {
      teamList.innerHTML = '<p>No hay equipos para este deporte y categoría.</p>';
      return;
    }
    teamList.innerHTML = teams.map((team) => {
      const id = escapeHtml(team.id);
      const name = escapeHtml(team.nombre);
      const category = escapeHtml(team.categoria);
      const captain = escapeHtml(team.capitanNombre || 'Sin asignar');
      const players = team.jugadores || [];
      const roster = players.length ? `<input class="admin-player-search" type="search" placeholder="Buscar jugador en ${name}..." aria-label="Buscar jugadores de ${name}" data-roster-search>` : '';
      const rows = players.map((player) => `
        <tr><td data-label="Jugador"><span class="admin-player-avatar" aria-hidden="true"></span><strong>${escapeHtml(player.nombre)}</strong></td>
        <td data-label="Grado / sección"><span class="admin-player-grade">${escapeHtml(player.grado || '')}</span></td><td data-label="Posición">${escapeHtml(player.posicion || '—')}</td>
        <td data-label="Camiseta"><input class="admin-roster-number" type="number" min="0" max="99" step="1" value="${Number(player.numero_camiseta) || 0}" aria-label="Número de camiseta de ${escapeHtml(player.nombre)}" data-roster-number data-player-id="${escapeHtml(player.id)}" data-initial-value="${Number(player.numero_camiseta) || 0}" required></td>
        <td data-label="Goles"><form class="goal-update-form" action="/admin/jugadores/${escapeHtml(player.id)}/goles" method="post">
          <input type="number" name="goles" min="0" step="1" value="${Number(player.goles) || 0}" aria-label="Goles de ${escapeHtml(player.nombre)}" data-roster-goals data-player-id="${escapeHtml(player.id)}" data-initial-value="${Number(player.goles) || 0}" required>
          <button class="icon-action" type="submit" aria-label="Guardar goles">✓</button></form></td>
        <td data-label="Acciones"><div class="admin-player-actions"><button class="admin-change-captain" type="button" data-modal-open="player-editor-modal"
          data-player-id="${escapeHtml(player.id)}" data-team-id="${id}" data-team-name="${name}" data-player-name="${escapeHtml(player.nombre)}"
          data-player-grade="${escapeHtml(player.grado)}" data-player-position="${escapeHtml(player.posicion)}" data-player-number="${Number(player.numero_camiseta) || 0}"
          data-player-goals="${Number(player.goles) || 0}">Editar</button>
          <form action="/admin/jugadores/${escapeHtml(player.id)}/eliminar" method="post"><button class="admin-delete-team" type="submit">Eliminar</button></form></div></td></tr>`).join('');
      return `<article class="result-item admin-team-item" data-admin-sport="${escapeHtml(team.deporte || 'futbol')}" data-admin-category="${category}" data-search="${escapeHtml(`${team.nombre} ${team.categoria} ${team.capitanNombre || ''}`.toLowerCase())}">
        <div class="admin-team-heading">${team.escudoUrl ? `<img class="admin-team-crest" src="${escapeHtml(team.escudoUrl)}" alt="Bandera de ${name}" loading="lazy">` : `<span class="admin-team-crest admin-team-crest--empty">${name.slice(0, 1)}</span>`}
        <div><strong>${name}${team.gradoPrincipal ? ` <span class="admin-team-primary-grade">· ${escapeHtml(team.gradoPrincipal)}</span>` : ''}</strong><small>${escapeHtml(sportName(team.deporte))} · ${category} · Capitán: ${captain}</small>${team.capitanEmail ? `<small>${escapeHtml(team.capitanEmail)}</small>` : ''}</div></div>
        <div class="admin-team-actions"><button class="admin-change-captain" type="button" data-modal-open="team-editor-modal" data-team-id="${id}" data-team-name="${name}" data-team-category="${category}" data-team-sport="${escapeHtml(team.deporte)}" data-team-crest="${escapeHtml(team.escudoUrl || '')}">Editar equipo</button>
        <button class="admin-change-captain" type="button" data-modal-open="captain-editor-modal" data-team-id="${id}" data-team-name="${name}" data-captain-email="${escapeHtml(team.capitanEmail || '')}">${team.capitanEmail ? 'Cambiar capitán' : 'Asignar capitán'}</button>
        <button class="admin-add-player" type="button" data-modal-open="player-editor-modal" data-team-id="${id}" data-team-name="${name}">+ Agregar jugador</button>
        <form action="/admin/equipos/${id}/eliminar" method="post" onsubmit="return confirm('Solo se eliminará el equipo si no tiene jugadores ni partidos asociados. ¿Continuar?')"><button class="admin-delete-team" type="submit">Eliminar equipo</button></form></div>
        <div class="admin-roster"><div class="admin-roster-heading"><strong>Plantilla</strong><span>${players.length} jugadores</span></div>${roster}
        ${players.length ? `<div class="admin-roster-table-wrap"><table class="admin-roster-table"><thead><tr><th scope="col">Jugador</th><th scope="col">Grado / sección</th><th scope="col">Posición</th><th scope="col">Camiseta</th><th scope="col">Goles</th><th scope="col">Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="admin-roster-save"><p class="admin-roster-feedback" role="status" aria-live="polite" data-roster-feedback hidden></p><button class="admin-roster-save-button" type="button" data-save-roster aria-label="Confirmar y guardar cambios de camiseta y goles"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"></path></svg>Guardar cambios</button></div>` : '<p class="form-hint">Todavía no hay jugadores para este equipo.</p>'}</div></article>`;
    }).join('');
  }

  function renderMatches(matches) {
    if (!matchList) return;
    if (!matches.length) {
      matchList.innerHTML = '<p>No hay partidos para este deporte y categoría.</p>';
      return;
    }
    matchList.innerHTML = matches.map((match) => `<article class="match-admin-item" data-match-status="${escapeHtml(match.estado)}" data-admin-sport="${escapeHtml(match.deporte)}" data-admin-category="${escapeHtml(match.categoria)}" data-search="${escapeHtml(`${match.equipo_local} ${match.equipo_visitante} ${match.cancha || ''}`.toLowerCase())}">
      <div class="result-item"><div class="match-admin-teams"><strong>${escapeHtml(match.equipo_local)}</strong><span>vs.</span><strong>${escapeHtml(match.equipo_visitante)}</strong><small>${Number(match.goles_local) || 0} - ${Number(match.goles_visitante) || 0}</small></div>
      <span>${escapeHtml(sportName(match.deporte))} · ${escapeHtml(match.fecha_partido)} · ${escapeHtml(match.hora_partido)} · ${escapeHtml(match.cancha || '')} · ${escapeHtml(match.estado)}</span>
      <button class="btn btn-secondary dark" type="button" data-modal-open="match-editor-modal" data-match-id="${escapeHtml(match.id)}" data-match-home-id="${escapeHtml(match.equipo_local_id || '')}" data-match-away-id="${escapeHtml(match.equipo_visitante_id || '')}" data-match-date="${escapeHtml(match.fecha_partido)}" data-match-time="${escapeHtml(match.hora_partido)}" data-match-venue="${escapeHtml(match.cancha || '')}" data-match-status="${escapeHtml(match.estado)}">Editar partido</button></div>
      <div class="result-item"><span>Marcador: <strong>${escapeHtml(match.resultado || '')}</strong></span><form action="/admin/partidos/${escapeHtml(match.id)}/resultados" method="post" class="score-form"><input type="number" name="golesLocal" min="0" value="${Number(match.goles_local) || 0}" required><span>-</span><input type="number" name="golesVisitante" min="0" value="${Number(match.goles_visitante) || 0}" required><button type="submit" class="btn btn-secondary dark">Guardar marcador</button></form>
      <form action="/admin/partidos/${escapeHtml(match.id)}/eliminar" method="post"><button type="submit" class="btn btn-danger">Eliminar</button></form></div></article>`).join('');
  }

  function renderStandings(rows) {
    if (!standingsBody) return;
    standingsBody.innerHTML = rows.length ? rows.map((team) => `<tr class="admin-standing-row" data-category="${escapeHtml(team.category)}" data-admin-category="${escapeHtml(team.category)}" data-admin-sport="${escapeHtml(team.deporte)}" data-search="${escapeHtml(`${team.name} ${team.category}`.toLowerCase())}">
      <td class="standings-rank">${team.rank}</td><th scope="row">${escapeHtml(team.name)}<small>${escapeHtml(team.category)}</small></th><td>${team.played}</td><td>${team.won}</td><td>${team.drawn}</td><td>${team.lost}</td><td>${team.goalsFor}</td><td>${team.goalsAgainst}</td><td>${team.goalDifference}</td><td class="standings-points">${team.points}</td></tr>`).join('')
      : '<tr><td colspan="10" class="sports-empty">No hay equipos ni resultados para esta selección.</td></tr>';
  }

  function applyTextFilters() {
    document.querySelectorAll('[data-filter-target]').forEach((input) => {
      const statusFilter = input.parentElement.querySelector('[data-filter-status]');
      const query = input.value.trim().toLocaleLowerCase();
      document.querySelectorAll(input.dataset.filterTarget).forEach((item) => {
        item.hidden = Boolean((query && !(item.dataset.search || item.textContent).toLocaleLowerCase().includes(query))
          || (statusFilter?.value && item.dataset.matchStatus !== statusFilter.value));
      });
    });
    document.querySelectorAll('[data-roster-search]').forEach((input) => {
      const query = input.value.trim().toLocaleLowerCase();
      input.closest('.admin-roster')?.querySelectorAll('tbody tr').forEach((row) => {
        row.hidden = !row.textContent.toLocaleLowerCase().includes(query);
      });
    });
  }

  async function loadScope({ updateUrl = true, pushState = false } = {}) {
    if (requestController) requestController.abort();
    const controller = new AbortController();
    requestController = controller;
    const category = categoryFilter?.value || '';
    sportChoices.forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.adminSportChoice === currentSport)));
    if (updateUrl) {
      const next = new URL(window.location.href);
      next.searchParams.set('deporte', currentSport);
      if (category) next.searchParams.set('categoria', category);
      else next.searchParams.delete('categoria');
      window.history[pushState ? 'pushState' : 'replaceState']({}, '', next);
    }
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    setStatus(`Cargando ${sportName(currentSport)}${category ? ` · ${category}` : ''}…`);
    document.querySelectorAll('#equipos .result-list, [data-admin-panel="matches"] .result-list').forEach((list) => list.setAttribute('aria-busy', 'true'));
    try {
      const query = new URLSearchParams({ deporte: currentSport, categoria: category });
      const response = await fetch(`/admin/api/torneo?${query}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'No se pudieron cargar los datos del torneo.');
      renderTeams(data.equipos || []);
      renderMatches(data.partidos || []);
      renderStandings(data.posiciones || []);
      const totals = data.resumen || {};
      document.querySelector('[data-kpi="teams"]').textContent = String(totals.equipos ?? 0);
      document.querySelector('[data-kpi="matches"]').textContent = String(totals.partidosPendientes ?? 0);
      document.querySelector('[data-kpi="goals"]').textContent = String(totals.goles ?? 0);
      requests.forEach((request) => { request.hidden = (request.dataset.adminSport !== currentSport) || Boolean(category && request.dataset.adminCategory !== category); });
      applyTextFilters();
      filterMatchTeamOptions();
      setStatus(`${sportName(currentSport)}${category ? ` · ${category}` : ' · todas las categorías'}`);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (errorBox) {
        errorBox.replaceChildren(document.createTextNode(error.message || 'No fue posible cargar esta selección.'));
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'admin-quiet-button';
        retry.textContent = 'Reintentar';
        retry.addEventListener('click', () => loadScope({ updateUrl: false }));
        errorBox.append(' ', retry);
        errorBox.hidden = false;
      }
      setStatus('No se pudo actualizar la selección.');
    } finally {
      if (!controller.signal.aborted) {
        document.querySelectorAll('#equipos .result-list, [data-admin-panel="matches"] .result-list').forEach((list) => list.removeAttribute('aria-busy'));
      }
    }
  }

  sportChoices.forEach((choice) => choice.addEventListener('click', () => {
    if (currentSport === choice.dataset.adminSportChoice) return;
    currentSport = choice.dataset.adminSportChoice;
    loadScope({ pushState: true });
  }));
  categoryFilter?.addEventListener('change', () => loadScope({ pushState: true }));
  document.querySelectorAll('[data-filter-target]').forEach((input) => {
    input.addEventListener('input', applyTextFilters);
    input.parentElement.querySelector('[data-filter-status]')?.addEventListener('change', applyTextFilters);
    input.parentElement.querySelector('[data-filter-category]')?.addEventListener('change', applyTextFilters);
  });
  document.addEventListener('input', (event) => {
    if (event.target.matches('.goal-update-form input[name="goles"], [data-roster-number], [data-roster-search]')) applyTextFilters();
  });
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save-roster]');
    if (!button) return;

    const roster = button.closest('.admin-roster');
    const feedback = roster?.querySelector('[data-roster-feedback]');
    if (!roster || !feedback) return;
    const rows = Array.from(roster.querySelectorAll('tbody tr'));
    const changedPlayers = [];

    for (const row of rows) {
      const numberInput = row.querySelector('[data-roster-number]');
      const goalsInput = row.querySelector('[data-roster-goals]');
      if (!numberInput || !goalsInput) continue;
      if (!numberInput.checkValidity()) {
        numberInput.reportValidity();
        numberInput.focus();
        return;
      }
      if (!goalsInput.checkValidity()) {
        goalsInput.reportValidity();
        goalsInput.focus();
        return;
      }
      if (numberInput.value !== numberInput.dataset.initialValue
        || goalsInput.value !== goalsInput.dataset.initialValue) {
        changedPlayers.push({
          id: numberInput.dataset.playerId,
          numero_camiseta: numberInput.value,
          goles: goalsInput.value
        });
      }
    }

    feedback.className = 'admin-roster-feedback';
    feedback.setAttribute('role', 'status');
    if (!changedPlayers.length) {
      feedback.hidden = false;
      feedback.textContent = 'No hay cambios pendientes en esta plantilla.';
      return;
    }
    if (!window.confirm(`¿Guardar los cambios de camiseta y goles de ${changedPlayers.length} ${changedPlayers.length === 1 ? 'jugador' : 'jugadores'}?`)) {
      feedback.hidden = true;
      return;
    }

    feedback.hidden = false;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    feedback.textContent = 'Guardando cambios…';
    try {
      const response = await fetch('/admin/jugadores/actualizacion-lote', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ jugadores: changedPlayers })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudieron guardar los cambios.');

      changedPlayers.forEach((player) => {
        const numberInput = Array.from(roster.querySelectorAll('[data-roster-number]'))
          .find((input) => input.dataset.playerId === player.id);
        const goalsInput = Array.from(roster.querySelectorAll('[data-roster-goals]'))
          .find((input) => input.dataset.playerId === player.id);
        if (numberInput) numberInput.dataset.initialValue = numberInput.value;
        if (goalsInput) goalsInput.dataset.initialValue = goalsInput.value;
        const editButton = rowButtonForPlayer(roster, player.id);
        if (editButton) {
          editButton.dataset.playerNumber = player.numero_camiseta;
          editButton.dataset.playerGoals = player.goles;
        }
      });
      feedback.classList.add('is-success');
      feedback.textContent = result.message || 'Se guardaron los cambios de la plantilla.';
    } catch (error) {
      feedback.classList.add('is-error');
      feedback.setAttribute('role', 'alert');
      feedback.textContent = error.message || 'No fue posible guardar los cambios. Verifica tu conexión e inténtalo de nuevo.';
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });

  function rowButtonForPlayer(roster, playerId) {
    return Array.from(roster.querySelectorAll('[data-player-id][data-player-number]'))
      .find((button) => button.dataset.playerId === playerId);
  }
  function filterMatchTeamOptions() {
    if (!matchHome || !matchAway) return;
    const editMode = Boolean(matchModal.dataset.editing === 'true');
    const selected = matchHome.selectedOptions[0]?.value ? matchHome.selectedOptions[0] : matchAway.selectedOptions[0];
    const sport = selected?.dataset.sport || currentSport;
    const category = selected?.dataset.category || categoryFilter?.value || '';
    [matchHome, matchAway].forEach((select) => {
      const other = select === matchHome ? matchAway.selectedOptions[0] : matchHome.selectedOptions[0];
      Array.from(select.options).forEach((option) => {
        if (!option.value) { option.hidden = false; return; }
        const sameScope = option.dataset.sport === sport && (!category || option.dataset.category === category);
        const sameOpponentGroup = !other?.value || (option.dataset.sport === other.dataset.sport
          && option.dataset.category === other.dataset.category);
        option.hidden = !(editMode ? sameOpponentGroup : sameScope && sameOpponentGroup);
      });
      if (select.selectedOptions[0]?.hidden) select.value = '';
    });
  }
  matchHome?.addEventListener('change', filterMatchTeamOptions);
  matchAway?.addEventListener('change', filterMatchTeamOptions);
  matchModal?.addEventListener('close', () => { matchModal.dataset.editing = 'false'; });
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal-open="match-editor-modal"]');
    if (!trigger || !matchModal) return;
    matchModal.dataset.editing = String(Boolean(trigger.dataset.matchId));
    filterMatchTeamOptions();
  });
  window.addEventListener('popstate', () => {
    const restored = new URLSearchParams(window.location.search);
    currentSport = validSports.has(restored.get('deporte')) ? restored.get('deporte') : 'futbol';
    if (categoryFilter) categoryFilter.value = restored.get('categoria') || '';
    loadScope({ updateUrl: false });
  });
  loadScope({ updateUrl: needsUrlNormalization });
})();

(function initializeAnnouncementEditor() {
  const form = document.querySelector('[data-announcement-form]');
  if (!form) return;
  const editor = form.querySelector('[data-rich-editor]');
  const hiddenValue = form.querySelector('[data-rich-value]');
  const titleInput = form.querySelector('[data-preview-title]');
  const titlePreview = form.querySelector('[data-preview-title-output]');
  const messagePreview = form.querySelector('[data-preview-message]');
  const allowedTags = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'A']);

  function safePreviewMarkup(value) {
    const parsed = new DOMParser().parseFromString(value, 'text/html');
    const copySafeNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
      if (!(node instanceof HTMLElement) || !allowedTags.has(node.tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes || []).forEach((child) => fragment.append(copySafeNode(child)));
        return fragment;
      }

      const safeNode = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        if (/^(?:https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(href) && !/[\u0000-\u001f]/.test(href)) {
          safeNode.setAttribute('href', href);
          safeNode.setAttribute('rel', 'nofollow noopener noreferrer');
        }
      }
      Array.from(node.childNodes).forEach((child) => safeNode.append(copySafeNode(child)));
      return safeNode;
    };

    const fragment = document.createDocumentFragment();
    Array.from(parsed.body.childNodes).forEach((node) => fragment.append(copySafeNode(node)));
    const container = document.createElement('div');
    container.append(fragment);
    return container.innerHTML;
  }

  function updateAnnouncementPreview() {
    titlePreview.textContent = titleInput.value.trim() || 'Título del anuncio';
    messagePreview.innerHTML = safePreviewMarkup(editor.innerHTML);
  }

  form.querySelectorAll('[data-format]').forEach((button) => {
    button.addEventListener('click', () => {
      editor.focus();
      const command = button.dataset.format;
      let value = command === 'formatBlock' ? `<${button.dataset.formatValue}>` : null;
      if (command === 'createLink') {
        value = window.prompt('Escribe una dirección HTTPS para el enlace:');
        if (!value) return;
        const isRelative = /^(?:\/|#|\.\/|\.\.\/)/.test(value);
        if (!isRelative && !/^https?:\/\//i.test(value)) {
          window.alert('El enlace debe comenzar con https:// o ser una ruta interna.');
          return;
        }
      }
      document.execCommand(command, false, value);
      updateAnnouncementPreview();
    });
  });

  editor.addEventListener('input', updateAnnouncementPreview);
  titleInput.addEventListener('input', updateAnnouncementPreview);
  form.addEventListener('submit', (event) => {
    hiddenValue.value = editor.innerHTML;
    if (!editor.textContent.trim()) {
      event.preventDefault();
      editor.focus();
      editor.setAttribute('aria-invalid', 'true');
    } else {
      editor.removeAttribute('aria-invalid');
    }
  });

  updateAnnouncementPreview();
})();

(function initializeImageQueues() {
  document.querySelectorAll('[data-image-queue]').forEach((input) => {
    const form = input.form;
    const preview = form.querySelector('[data-image-thumbnails]');
    if (!preview) return;
    const maxCount = input.name === 'imagenAnuncio' ? 5 : 10;
    let selectedFiles = [];
    let objectUrls = [];

    function renderQueue() {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls = [];
      preview.replaceChildren();
      selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'admin-image-thumbnail';
        const image = document.createElement('img');
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        image.src = url;
        image.alt = `Vista previa ${index + 1}: ${file.name}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Quitar';
        remove.setAttribute('aria-label', `Quitar ${file.name}`);
        remove.addEventListener('click', () => {
          selectedFiles.splice(index, 1);
          const transfer = new DataTransfer();
          selectedFiles.forEach((selected) => transfer.items.add(selected));
          input.files = transfer.files;
          renderQueue();
          if (input.name === 'imagenAnuncio') input.dispatchEvent(new Event('change'));
        });
        item.append(image, remove);
        preview.append(item);
      });
      const tooMany = selectedFiles.length > maxCount;
      input.setCustomValidity(tooMany ? `Selecciona como máximo ${maxCount} imágenes.` : '');
      if (tooMany) {
        const warning = document.createElement('p');
        warning.className = 'admin-image-queue-warning';
        warning.textContent = `Seleccionaste ${selectedFiles.length}; el máximo permitido es ${maxCount}. Quita algunas imágenes para continuar.`;
        preview.append(warning);
      }
    }

    input.addEventListener('change', () => {
      selectedFiles = Array.from(input.files || []);
      renderQueue();
      if (input.name === 'imagenAnuncio') {
        const images = form.querySelector('[data-preview-images]');
        images.replaceChildren();
        selectedFiles.forEach((file) => {
          const image = document.createElement('img');
          image.src = URL.createObjectURL(file);
          image.alt = 'Vista previa de imagen del anuncio';
          images.append(image);
        });
      }
    });

    const dropzone = input.closest('.admin-dropzone');
    dropzone?.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
    dropzone?.addEventListener('dragleave', (event) => {
      if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('is-dragging');
    });
    dropzone?.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
      const transfer = new DataTransfer();
      selectedFiles.concat(Array.from(event.dataTransfer.files)).forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    });
  });
})();

(function initializeAdminAjaxForms() {
  document.addEventListener('submit', async (event) => {
      const form = event.target.closest('.dashboard-content form[method="post"]:not([data-enrollment-toggle])');
      if (!form) return;
      if (event.defaultPrevented) return;
      event.preventDefault();

      if (form.matches('[data-announcement-form]')) {
        form.querySelector('[data-rich-value]').value = form.querySelector('[data-rich-editor]').innerHTML;
      }

      let feedback = form.querySelector('.admin-form-feedback');
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'admin-form-feedback';
        feedback.setAttribute('role', 'status');
        feedback.setAttribute('aria-live', 'polite');
        form.prepend(feedback);
      }
      feedback.className = 'admin-form-feedback';
      feedback.textContent = 'Guardando…';

      try {
        const formData = new FormData(form);
        const includesFiles = Array.from(form.querySelectorAll('input[type="file"]'))
          .some((input) => input.files && input.files.length > 0);
        const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
        let body;

        if (includesFiles) {
          body = formData;
        } else {
          const data = {};
          formData.forEach((value, key) => {
            if (Object.hasOwn(data, key)) {
              data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
            } else {
              data[key] = value;
            }
          });
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(data);
        }

        const response = await fetch(form.action, { method: 'POST', body, headers });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          feedback.classList.add('is-error');
          feedback.setAttribute('role', 'alert');
          feedback.textContent = result.message || 'No se pudo guardar la información.';
          return;
        }
        feedback.classList.add('is-success');
        feedback.textContent = result.message;
        window.setTimeout(() => window.location.reload(), 650);
      } catch (error) {
        feedback.classList.add('is-error');
        feedback.setAttribute('role', 'alert');
        feedback.textContent = 'No se pudo completar la solicitud. Verifica tu conexión e inténtalo de nuevo.';
      }
  });
})();

(function initializeEnrollmentToggle() {
  const form = document.querySelector('[data-enrollment-toggle]');
  if (!form) return;

  const toggle = form.querySelector('input[name="inscripcionesAbiertas"]');
  const feedback = form.querySelector('.enrollment-toggle__feedback');
  const status = form.querySelector('.enrollment-toggle__copy strong');
  const submitButton = form.querySelector('button[type="submit"]');
  if (!toggle || !feedback || !status || !submitButton) return;
  let savedState = toggle.checked;

  form.addEventListener('change', (event) => {
    if (event.target === toggle) form.requestSubmit();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const requestedState = toggle.checked;
    toggle.disabled = true;
    submitButton.disabled = true;
    feedback.className = 'enrollment-toggle__feedback';
    feedback.setAttribute('role', 'status');
    feedback.textContent = 'Guardando…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ inscripcionesAbiertas: requestedState })
      });
      const result = await response.json();
      if (!response.ok || result.success !== true || typeof result.inscripcionesAbiertas !== 'boolean') {
        throw new Error(result.message || 'No se pudo actualizar el estado de las inscripciones.');
      }

      toggle.checked = result.inscripcionesAbiertas;
      savedState = result.inscripcionesAbiertas;
      status.textContent = `Inscripciones ${result.inscripcionesAbiertas ? 'abiertas' : 'cerradas'}`;
      feedback.classList.add('is-success');
      feedback.textContent = 'Estado actualizado correctamente.';
    } catch (error) {
      toggle.checked = savedState;
      status.textContent = `Inscripciones ${toggle.checked ? 'abiertas' : 'cerradas'}`;
      feedback.classList.add('is-error');
      feedback.setAttribute('role', 'alert');
      feedback.textContent = error.message || 'No se pudo completar la solicitud. Verifica tu conexión e inténtalo de nuevo.';
    } finally {
      toggle.disabled = false;
      submitButton.disabled = false;
    }
  });
})();