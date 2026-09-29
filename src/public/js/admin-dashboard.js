(function initializeAdminDashboard() {
  const navigation = document.querySelector('.admin-section-nav');

  if (!navigation) return;

  const tabs = Array.from(navigation.querySelectorAll('[data-admin-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-admin-panel]'));
  const mobileNavigation = window.matchMedia('(max-width: 760px)');

  if (!tabs.length || !panels.length) return;

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
  document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
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
        modal.querySelector('#player-editor-number').value = trigger.dataset.playerNumber || '0';
        modal.querySelector('#player-editor-position').value = trigger.dataset.playerPosition || '';
        modal.querySelector('#player-editor-goals').value = trigger.dataset.playerGoals || '0';
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