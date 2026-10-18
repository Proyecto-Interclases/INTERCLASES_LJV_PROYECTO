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
  let playerPhotoObjectUrl = '';
  let activePlayerPhoto = '';
  const playerModal = document.querySelector('#player-editor-modal');
  const playerForm = playerModal?.querySelector('#player-editor-form');
  const photoInput = playerModal?.querySelector('[data-player-photo-input]');
  const dropzone = playerModal?.querySelector('[data-player-dropzone]');
  const fileName = playerModal?.querySelector('[data-player-file-name]');
  const previewPanel = playerModal?.querySelector('[data-player-preview-panel]');
  const previewToggle = playerModal?.querySelector('[data-player-preview-toggle]');

  function abbreviatePlayerPosition(value) {
    const position = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (/port|arqu|goalkeeper|\bgk\b|\bpor\b/.test(position)) return 'POR';
    if (/defen|lateral|central|zagu|back|\bdf\b|\bld\b|\bli\b/.test(position)) return 'DEF';
    if (/medio|volante|midfield|\bmc\b|\bmd\b|\bmi\b/.test(position)) return 'MED';
    if (/delan|atac|extremo|forward|striker|punta|\bdc\b|\bst\b|\bed\b|\bei\b/.test(position)) return 'DEL';
    return position ? position.slice(0, 3).toUpperCase() : 'JUG';
  }

  function showPlayerPhotoPreview(source) {
    const preview = playerModal?.querySelector('[data-player-photo-preview]');
    const image = preview?.querySelector('img');
    const placeholder = preview?.querySelector('span');
    const cardImage = previewPanel?.querySelector('[data-preview-photo]');
    const cardPlaceholder = previewPanel?.querySelector('[data-preview-placeholder]');
    if (image && placeholder) {
      image.src = source || '';
      image.hidden = !source;
      placeholder.hidden = Boolean(source);
    }
    if (cardImage && cardPlaceholder) {
      cardImage.src = source || '';
      cardImage.hidden = !source;
      cardPlaceholder.hidden = Boolean(source);
    }
  }

  function updatePlayerCardPreview() {
    if (!playerForm) return;
    const name = playerForm.querySelector('#player-editor-name').value.trim();
    const grade = playerForm.querySelector('#player-editor-grade').value.trim();
    const number = playerForm.querySelector('#player-editor-number').value || '0';
    const position = playerForm.querySelector('#player-editor-position').value.trim();
    const goals = playerForm.querySelector('#player-editor-goals').value || '0';
    const card = previewPanel?.querySelector('.player-preview-card');
    if (!card) return;
    previewPanel.querySelector('[data-preview-name]').textContent = name || 'Nombre del jugador';
    previewPanel.querySelector('[data-preview-grade]').textContent = grade || 'Grado o sección';
    previewPanel.querySelector('[data-preview-number]').textContent = number;
    previewPanel.querySelector('[data-preview-position]').textContent = abbreviatePlayerPosition(position);
    previewPanel.querySelector('[data-preview-goals]').textContent = String(Number(goals) || 0);
  }

  function setPlayerPhoto(file) {
    if (playerPhotoObjectUrl) URL.revokeObjectURL(playerPhotoObjectUrl);
    playerPhotoObjectUrl = '';
    if (!file) {
      if (fileName) fileName.textContent = activePlayerPhoto
        ? 'Foto actual · selecciona para reemplazar'
        : 'JPG, PNG o WebP · Máximo 3 MB';
      showPlayerPhotoPreview(activePlayerPhoto);
      return;
    }

    const supportedType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const tooLarge = file.size > 3 * 1024 * 1024;
    photoInput.setCustomValidity(!supportedType
      ? 'Selecciona una imagen JPG, PNG o WebP.'
      : tooLarge ? 'La imagen debe pesar como máximo 3 MB.' : '');
    if (fileName) {
      fileName.textContent = !supportedType
        ? 'Formato no compatible · usa JPG, PNG o WebP'
        : tooLarge ? 'La imagen supera el máximo de 3 MB' : file.name;
    }
    if (!supportedType || tooLarge) {
      showPlayerPhotoPreview(activePlayerPhoto);
      return;
    }
    playerPhotoObjectUrl = URL.createObjectURL(file);
    showPlayerPhotoPreview(playerPhotoObjectUrl);
  }

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

        playerForm.reset();
        if (playerPhotoObjectUrl) URL.revokeObjectURL(playerPhotoObjectUrl);
        playerPhotoObjectUrl = '';
        activePlayerPhoto = trigger.dataset.playerPhoto || '';
        photoInput.setCustomValidity('');
        if (fileName) fileName.textContent = activePlayerPhoto
          ? 'Foto actual · selecciona para reemplazar'
          : 'JPG, PNG o WebP · Máximo 3 MB';
        previewPanel.hidden = true;
        previewToggle.setAttribute('aria-expanded', 'false');
        modal.classList.remove('has-player-preview');
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
        showPlayerPhotoPreview(activePlayerPhoto);
        updatePlayerCardPreview();
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
        crestPreview.alt = `Escudo de ${trigger.dataset.teamName || 'equipo'}`;
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

      if (modal.id === 'user-password-modal') {
        const form = modal.querySelector('#user-password-form');
        form.reset();
        form.action = `/admin/usuarios/${encodeURIComponent(trigger.dataset.userId || '')}/restablecer-password`;
        modal.querySelector('#user-password-confirm').setCustomValidity('');
        modal.querySelector('[data-user-password-target]').textContent =
          `Cuenta: ${trigger.dataset.userName || ''} · ${trigger.dataset.userEmail || ''}`;
        const feedback = modal.querySelector('[data-user-password-feedback]');
        feedback.textContent = '';
        feedback.className = 'admin-form-feedback';
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

  photoInput?.addEventListener('change', () => setPlayerPhoto(photoInput.files?.[0] || null));
  playerForm?.querySelectorAll('#player-editor-name, #player-editor-grade, #player-editor-number, #player-editor-position, #player-editor-goals')
    .forEach((input) => input.addEventListener('input', updatePlayerCardPreview));
  previewToggle?.addEventListener('click', () => {
    const isVisible = !previewPanel.hidden;
    previewPanel.hidden = isVisible;
    previewToggle.setAttribute('aria-expanded', String(!isVisible));
    playerModal.classList.toggle('has-player-preview', !isVisible);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });
  dropzone?.addEventListener('dragleave', (event) => {
    if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('is-dragging');
  });
  dropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    photoInput.files = transfer.files;
    photoInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  playerModal?.addEventListener('close', () => {
    if (playerPhotoObjectUrl) URL.revokeObjectURL(playerPhotoObjectUrl);
    playerPhotoObjectUrl = '';
    activePlayerPhoto = '';
    previewPanel.hidden = true;
    previewToggle.setAttribute('aria-expanded', 'false');
    playerModal.classList.remove('has-player-preview');
  });
})();

(function initializeUserPasswordReset() {
  const form = document.querySelector('[data-user-password-form]');
  if (!form) return;

  const password = form.querySelector('#user-password-input');
  const confirmation = form.querySelector('#user-password-confirm');
  const feedback = form.querySelector('[data-user-password-feedback]');
  const submitButton = form.querySelector('button[type="submit"]');

  confirmation.addEventListener('input', () => {
    confirmation.setCustomValidity(
      confirmation.value && confirmation.value !== password.value
        ? 'Las contraseñas no coinciden.'
        : ''
    );
  });
  password.addEventListener('input', () => confirmation.dispatchEvent(new Event('input')));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    feedback.className = 'admin-form-feedback';
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
        body: JSON.stringify({ password: password.value })
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || 'No se pudo restablecer la contraseña.');
      }
      feedback.classList.add('is-success');
      feedback.textContent = result.message;
      password.value = '';
      confirmation.value = '';
    } catch (error) {
      feedback.classList.add('is-error');
      feedback.setAttribute('role', 'alert');
      feedback.textContent = error.message || 'No se pudo completar la solicitud.';
    } finally {
      submitButton.disabled = false;
    }
  });
})();

(function initializeAdminFilters() {
  const sportChoices = Array.from(document.querySelectorAll('[data-admin-sport-choice]'));
  const categoryFilter = document.querySelector('[data-admin-category-filter]');
  const status = document.querySelector('[data-admin-scope-status]');
  const errorBox = document.querySelector('[data-admin-scope-error]');
  const teamList = document.querySelector('#equipos .result-list.dashboard-list');
  const teamOrder = document.querySelector('[data-admin-team-order]');
  const matchList = document.querySelector('[data-admin-panel="matches"] .result-list.dashboard-list');
  const standingsBody = document.querySelector('.standings-table tbody');
  const standingsSearch = document.querySelector('[data-standings-search]');
  const standingsCategoryFilter = document.querySelector('[data-standings-category-filter]');
  const requests = Array.from(document.querySelectorAll('.enrollment-request-card'));
  const matchModal = document.querySelector('#match-editor-modal');
  const matchHome = matchModal?.querySelector('#match-editor-home');
  const matchAway = matchModal?.querySelector('#match-editor-away');
  const params = new URLSearchParams(window.location.search);
  const validSports = new Set(sportChoices.map((choice) => choice.dataset.adminSportChoice));
  const validCategories = new Set(Array.from(categoryFilter?.options || []).map((option) => option.value));
  let currentSport = validSports.has(params.get('deporte')) ? params.get('deporte') : 'futbol';
  const requestedOrder = params.get('orden') === 'asc' ? 'asc' : (teamOrder?.value || 'desc');
  if (teamOrder) teamOrder.value = requestedOrder;
  const requestedCategory = params.get('categoria') || '';
  const needsUrlNormalization = !validSports.has(params.get('deporte'))
    || (requestedCategory && !validCategories.has(requestedCategory));
  let requestController;

  function normalizeCategory(value) {
    const category = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('es');
    if (['', 'all', 'todas', 'todos'].includes(category)) return '';
    return category.replace(/^(categoria|category)\s*/, '').replace(/\s+/g, ' ');
  }

  if (categoryFilter) categoryFilter.value = validCategories.has(requestedCategory) ? requestedCategory : '';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const sportName = (id) => sportChoices.find((choice) => choice.dataset.adminSportChoice === id)?.querySelector('span')?.textContent || 'Fútbol';
  const setStatus = (message) => { if (status) status.textContent = message; };
  const gradeParts = (value) => Array.from(String(value || '').matchAll(/(\d{1,2})\s*(?:\.\s*)?(?:º|°)\s*(\d{1,2})|(\d{1,2})\s*-\s*(\d{1,2})/g))
    .map((match) => ({ grade: Number(match[1] || match[3]), section: Number(match[2] || match[4]) }));

  function sortAdminTeams() {
    if (!teamList || !teamOrder) return;
    const descending = teamOrder.value !== 'asc';
    const cards = Array.from(teamList.querySelectorAll('.admin-team-item'));
    cards.sort((first, second) => {
      const firstGermany = first.dataset.teamName?.trim().toLocaleLowerCase('es') === 'alemania';
      const secondGermany = second.dataset.teamName?.trim().toLocaleLowerCase('es') === 'alemania';
      const getGrade = (card, isGermany) => {
        if (isGermany && descending) return { grade: 11, section: 2.5 };
        return gradeParts(card.dataset.teamGrade)
          .reduce((highest, part) => part.grade > highest.grade
            || (part.grade === highest.grade && part.section > highest.section) ? part : highest, { grade: 0, section: 0 });
      };
      const firstGrade = getGrade(first, firstGermany);
      const secondGrade = getGrade(second, secondGermany);
      const gradeOrder = descending
        ? secondGrade.grade - firstGrade.grade || firstGrade.section - secondGrade.section
        : firstGrade.grade - secondGrade.grade || secondGrade.section - firstGrade.section;
      return gradeOrder
        || first.dataset.adminCategory.localeCompare(second.dataset.adminCategory, 'es')
        || first.dataset.teamName.localeCompare(second.dataset.teamName, 'es');
    });
    cards.forEach((card) => teamList.append(card));
  }

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
      const rows = players.map((player) => {
        const playerId = escapeHtml(player.id);
        const playerName = escapeHtml(player.nombre);
        const number = String(player.numero_camiseta ?? '0');
        const goals = Number(player.goles) || 0;
        const avatar = player.fotoUrl
          ? `<img src="${escapeHtml(player.fotoUrl)}" alt="Foto de ${playerName}" loading="lazy">`
          : '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="22" r="12"></circle><path d="M9 59c2-13 10-20 23-20s21 7 23 20"></path></svg>';
        return `<tr data-roster-player>
          <td data-label="Jugador"><span class="admin-player-avatar" aria-hidden="true">${avatar}</span><strong>${playerName}</strong></td>
          <td data-label="Grado / sección"><span class="admin-player-grade">${escapeHtml(player.grado || '')}</span></td>
          <td data-label="Posición">${escapeHtml(player.posicion || '—')}</td>
          <td data-label="Camiseta"><input class="admin-roster-number" type="text" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" value="${number}" aria-label="Número de camiseta de ${playerName}" data-roster-number data-player-id="${playerId}" data-initial-value="${number}" required></td>
          <td data-label="Goles"><form class="goal-update-form" action="/admin/jugadores/${playerId}/goles" method="post">
            <input type="number" name="goles" min="0" step="1" value="${goals}" aria-label="Goles de ${playerName}" data-roster-goals data-player-id="${playerId}" data-initial-value="${goals}" required>
            <button class="icon-action" type="submit" aria-label="Guardar goles de ${playerName}" title="Guardar goles">✓</button></form></td>
          <td data-label="Acciones"><div class="admin-player-actions"><button class="icon-action" type="button" data-modal-open="player-editor-modal" data-player-id="${playerId}" data-team-id="${id}" data-team-name="${name}" data-player-name="${playerName}"
            data-player-grade="${escapeHtml(player.grado || '')}" data-player-position="${escapeHtml(player.posicion || '')}" data-player-number="${number}" data-player-goals="${goals}" data-player-photo="${escapeHtml(player.fotoUrl || '')}" aria-label="Editar jugador" title="Editar jugador"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 5 4 4M4 20l4.3-.9L19 8.4a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z"></path></svg></button>
            <form action="/admin/jugadores/${playerId}/eliminar" method="post" onsubmit="return confirm('¿Eliminar este jugador de la plantilla?')"><button class="icon-action icon-action--danger" type="submit" aria-label="Eliminar jugador" title="Eliminar jugador"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"></path></svg></button></form></div></td>
        </tr>`;
      }).join('');
      return `<article class="result-item admin-team-item" data-team-grade="${escapeHtml(team.gradoPrincipal || '')}" data-team-name="${name}" data-admin-sport="${escapeHtml(team.deporte || 'futbol')}" data-admin-category="${category}" data-search="${escapeHtml(`${team.nombre} ${team.categoria} ${team.capitanNombre || ''}`.toLowerCase())}">
        <div class="admin-team-heading">${team.escudoUrl ? `<img class="admin-team-crest" src="${escapeHtml(team.escudoUrl)}" alt="Escudo de ${name}" loading="lazy">` : `<span class="admin-team-crest admin-team-crest--empty">${name.slice(0, 1)}</span>`}
        <div><strong>${name}${team.gradoPrincipal ? ` <span class="admin-team-primary-grade">· ${escapeHtml(team.gradoPrincipal)}</span>` : ''}</strong><small>${escapeHtml(sportName(team.deporte))} · ${category} · Capitán: ${captain}</small>${team.capitanEmail ? `<small>${escapeHtml(team.capitanEmail)}</small>` : ''}</div></div>
        <div class="admin-team-actions"><button class="admin-change-captain" type="button" data-modal-open="team-editor-modal" data-team-id="${id}" data-team-name="${name}" data-team-category="${category}" data-team-sport="${escapeHtml(team.deporte)}" data-team-crest="${escapeHtml(team.escudoUrl || '')}">Editar equipo</button>
        <button class="admin-change-captain" type="button" data-modal-open="captain-editor-modal" data-team-id="${id}" data-team-name="${name}" data-captain-email="${escapeHtml(team.capitanEmail || '')}">${team.capitanEmail ? 'Cambiar capitán' : 'Asignar capitán'}</button>
        <button class="admin-add-player" type="button" data-modal-open="player-editor-modal" data-team-id="${id}" data-team-name="${name}">+ Agregar jugador</button>
        <form action="/admin/equipos/${id}/eliminar" method="post" onsubmit="return confirm('Solo se eliminará el equipo si no tiene jugadores ni partidos asociados. ¿Continuar?')"><button class="admin-delete-team" type="submit">Eliminar equipo</button></form></div>
        <details class="admin-roster" data-roster-accordion><summary class="admin-roster-heading"><strong data-roster-toggle-label>Desplegar plantilla</strong><span>${players.length} jugadores</span></summary>
        <div class="admin-roster-content">${roster}
        ${players.length ? `<div class="admin-roster-table-wrap"><table class="admin-roster-table"><thead><tr><th scope="col">Jugador</th><th scope="col">Grado / sección</th><th scope="col">Posición</th><th scope="col">Camiseta</th><th scope="col">Goles</th><th scope="col">Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="admin-roster-save"><p class="admin-roster-feedback" role="status" aria-live="polite" data-roster-feedback hidden></p><button class="admin-roster-save-button" type="button" data-save-roster aria-label="Confirmar y guardar cambios de camiseta y goles"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"></path></svg>Guardar cambios</button></div>` : '<p class="form-hint">Todavía no hay jugadores para este equipo.</p>'}</div></details></article>`;
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
    const standings = Array.isArray(rows) ? rows.flat() : [];
    const showCombinedRanking = !normalizeCategory(categoryFilter?.value)
      && !normalizeCategory(standingsCategoryFilter?.value);
    const standingsRows = standings.map((team, index) => {
      const sport = encodeURIComponent(team.deporte || 'futbol');
      const category = encodeURIComponent(team.category || '');
      const crest = team.escudoUrl
        ? `<img class="standings-crest" src="${escapeHtml(team.escudoUrl)}" alt="" loading="lazy">`
        : '';
      const goalDifference = Number(team.goalDifference) || 0;
      const rank = showCombinedRanking ? index + 1 : Number(team.rank) || index + 1;
      return `<tr class="admin-standing-row" data-category="${escapeHtml(team.category)}" data-admin-category="${escapeHtml(team.category)}" data-admin-sport="${escapeHtml(team.deporte)}" data-search="${escapeHtml(`${team.name} ${team.category}`.toLowerCase())}">
      <td class="standings-rank">${String(rank).padStart(2, '0')}</td><th scope="row"><a href="/equipos?deporte=${sport}&amp;categoria=${category}">${crest}${escapeHtml(team.name)}</a><small>${escapeHtml(team.category)}</small></th><td>${Number(team.played) || 0}</td><td>${Number(team.won) || 0}</td><td>${Number(team.drawn) || 0}</td><td>${Number(team.lost) || 0}</td><td>${Number(team.goalsFor) || 0}</td><td>${Number(team.goalsAgainst) || 0}</td><td>${goalDifference > 0 ? '+' : ''}${goalDifference}</td><td class="standings-points">${Number(team.points) || 0}</td></tr>`;
    }).join('');
    standingsBody.replaceChildren();
    standingsBody.insertAdjacentHTML(
      'beforeend',
      `${standingsRows}<tr data-standings-empty${standings.length ? ' hidden' : ''}><td colspan="10" class="sports-empty">No hay equipos para la categoría seleccionada.</td></tr>`
    );
    applyStandingsFilters();
  }

  function applyStandingsFilters() {
    if (!standingsBody) return;
    const query = standingsSearch?.value.trim().toLocaleLowerCase() || '';
    const globalCategory = normalizeCategory(categoryFilter?.value || '');
    const category = normalizeCategory(standingsCategoryFilter?.value || '');
    let visibleCount = 0;

    standingsBody.querySelectorAll('.admin-standing-row').forEach((row) => {
      row.classList.remove('d-none', 'hidden');
      row.style.removeProperty('display');
      row.hidden = false;
      const rowCategory = normalizeCategory(row.dataset.category);
      const matchesCategory = (!globalCategory || rowCategory === globalCategory)
        && (!category || rowCategory === category);
      const matchesQuery = !query || (row.dataset.search || row.textContent)
        .toLocaleLowerCase()
        .includes(query);
      row.hidden = !matchesCategory || !matchesQuery;
      if (!row.hidden) visibleCount += 1;
    });

    const emptyState = standingsBody.querySelector('[data-standings-empty]');
    if (emptyState) emptyState.hidden = visibleCount > 0;
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
      input.closest('.admin-roster')?.querySelectorAll('[data-roster-player]').forEach((card) => {
        card.hidden = !card.textContent.toLocaleLowerCase().includes(query);
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
      next.searchParams.set('orden', teamOrder?.value || 'desc');
      window.history[pushState ? 'pushState' : 'replaceState']({}, '', next);
    }
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    setStatus(`Cargando ${sportName(currentSport)}${category ? ` · ${category}` : ''}…`);
    document.querySelectorAll('#equipos .result-list, [data-admin-panel="matches"] .result-list').forEach((list) => list.setAttribute('aria-busy', 'true'));
    try {
      const query = new URLSearchParams({ deporte: currentSport, categoria: category, orden: teamOrder?.value || 'desc' });
      const response = await fetch(`/admin/api/torneo?${query}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'No se pudieron cargar los datos del torneo.');
      renderTeams(data.equipos || []);
      sortAdminTeams();
      renderMatches(data.partidos || []);
      renderStandings(data.posiciones || []);
      const totals = data.resumen || {};
      document.querySelector('[data-kpi="teams"]').textContent = String(totals.equipos ?? 0);
      document.querySelector('[data-kpi="matches"]').textContent = String(totals.partidosPendientes ?? 0);
      document.querySelector('[data-kpi="goals"]').textContent = String(totals.goles ?? 0);
      requests.forEach((request) => { request.hidden = (request.dataset.adminSport !== currentSport) || Boolean(category && request.dataset.adminCategory !== category); });
      applyTextFilters();
      applyStandingsFilters();
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

  document.addEventListener('admin:refresh-scope', () => {
    const scrollPosition = window.scrollY;
    loadScope({ updateUrl: false }).finally(() => {
      window.requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    });
  });

  sportChoices.forEach((choice) => choice.addEventListener('click', () => {
    if (currentSport === choice.dataset.adminSportChoice) return;
    currentSport = choice.dataset.adminSportChoice;
    loadScope({ pushState: true });
  }));
  categoryFilter?.addEventListener('change', () => loadScope({ pushState: true }));
  teamOrder?.addEventListener('change', () => {
    sortAdminTeams();
    const next = new URL(window.location.href);
    next.searchParams.set('orden', teamOrder.value);
    window.history.pushState({}, '', next);
  });
  document.querySelectorAll('[data-filter-target]').forEach((input) => {
    input.addEventListener('input', applyTextFilters);
    input.parentElement.querySelector('[data-filter-status]')?.addEventListener('change', applyTextFilters);
    input.parentElement.querySelector('[data-filter-category]')?.addEventListener('change', applyTextFilters);
  });
  standingsSearch?.addEventListener('input', applyStandingsFilters);
  standingsCategoryFilter?.addEventListener('change', applyStandingsFilters);
  document.addEventListener('input', (event) => {
    if (event.target.matches('.goal-update-form input[name="goles"], [data-roster-number], [data-roster-search]')) applyTextFilters();
  });
  sortAdminTeams();
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save-roster]');
    if (!button) return;

    const roster = button.closest('.admin-roster');
    const feedback = roster?.querySelector('[data-roster-feedback]');
    if (!roster || !feedback) return;
    const cards = Array.from(roster.querySelectorAll('[data-roster-player]'));
    const changedPlayers = [];

    for (const card of cards) {
      const numberInput = card.querySelector('[data-roster-number]');
      const goalsInput = card.querySelector('[data-roster-goals]');
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
      document.dispatchEvent(new Event('admin:refresh-scope'));
      document.dispatchEvent(new CustomEvent('admin:notify', { detail: { message: feedback.textContent } }));
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
  const dashboardContent = document.querySelector('.dashboard-content');

  function showNotification(message, isError = false) {
    if (!dashboardContent) return;
    let notification = dashboardContent.querySelector('[data-admin-ajax-notification]');
    if (!notification) {
      notification = document.createElement('div');
      notification.dataset.adminAjaxNotification = '';
      notification.setAttribute('role', 'status');
      notification.setAttribute('aria-live', 'polite');
      dashboardContent.prepend(notification);
    }
    notification.className = `auth-alert ${isError ? 'error' : 'success'}`;
    notification.setAttribute('role', isError ? 'alert' : 'status');
    notification.textContent = message;
  }

  document.addEventListener('admin:notify', (event) => {
    showNotification(event.detail?.message || 'Cambios guardados correctamente.', event.detail?.isError);
  });

  function updateLocalCard(form) {
    const pathname = new URL(form.action).pathname;
    const enrollmentAction = pathname.match(/\/inscripciones\/[^/]+\/(aprobar|rechazar|eliminar)$/);
    if (enrollmentAction) {
      const card = form.closest('.enrollment-request-card');
      if (enrollmentAction[1] === 'eliminar') {
        card?.remove();
      } else if (card) {
        const state = enrollmentAction[1] === 'aprobar' ? 'aprobada' : 'rechazada';
        const status = card.querySelector('.enrollment-status');
        if (status) {
          status.className = `enrollment-status enrollment-status--${state}`;
          status.textContent = state;
        }
        card.querySelector('.enrollment-request-actions')?.remove();
        const count = document.querySelector('.enrollment-requests-heading > span');
        if (count) {
          const pending = Math.max(0, Number.parseInt(count.textContent, 10) - 1);
          count.textContent = `${pending} pendientes`;
        }
      }
    }

    if (/\/galeria\/[^/]+\/eliminar$/.test(pathname)) {
      form.closest('.gallery-admin-card')?.remove();
    } else if (/\/galeria\/[^/]+\/estado$/.test(pathname)) {
      const card = form.closest('.gallery-admin-card');
      const active = form.querySelector('input[name="activo"]')?.value === '1';
      const button = form.querySelector('button[type="submit"]');
      const details = card?.querySelector('.gallery-admin-card__details small');
      if (button) button.textContent = active ? 'Ocultar' : 'Mostrar';
      if (details) details.textContent = details.textContent.replace(/·\s*(Visible|Oculta)$/, `· ${active ? 'Visible' : 'Oculta'}`);
      const hiddenState = form.querySelector('input[name="activo"]');
      if (hiddenState) hiddenState.value = active ? '0' : '1';
    }
  }

  document.addEventListener('submit', async (event) => {
      const form = event.target instanceof HTMLFormElement
        ? event.target.closest('.dashboard-content form[method="post"]:not([data-enrollment-toggle])')
        : null;
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
      const submitButton = event.submitter || form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitButton) submitButton.disabled = true;

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
          showNotification(feedback.textContent, true);
          return;
        }
        feedback.classList.add('is-success');
        feedback.textContent = result.message || 'Cambios guardados correctamente.';
        updateLocalCard(form);

        const pathname = new URL(form.action).pathname;
        const refreshTournament = /\/(?:equipos|jugadores|partidos)(?:\/|$)/.test(pathname)
          || /\/inscripciones\/[^/]+\/aprobar$/.test(pathname);
        if (refreshTournament) document.dispatchEvent(new Event('admin:refresh-scope'));

        const modal = form.closest('dialog');
        if (modal) {
          form.reset();
          modal.close();
        }
        showNotification(feedback.textContent);
      } catch (error) {
        feedback.classList.add('is-error');
        feedback.setAttribute('role', 'alert');
        feedback.textContent = error.message || 'No se pudo completar la solicitud. Verifica tu conexión e inténtalo de nuevo.';
        showNotification(feedback.textContent, true);
      } finally {
        if (submitButton) submitButton.disabled = false;
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