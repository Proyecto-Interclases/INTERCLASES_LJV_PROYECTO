(function initializeAdminDashboard() {
  const navigation = document.querySelector('.admin-section-nav');
  const mobileNavigationToggle = document.querySelector('.admin-navigation-toggle');

  if (!navigation) return;

  const tabs = Array.from(navigation.querySelectorAll('[data-admin-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-admin-panel]'));
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

      if (modal.id === 'team-editor-modal') {
        const teamForm = modal.querySelector('#team-editor-form');
        teamForm.action = `/admin/equipos/${encodeURIComponent(trigger.dataset.teamId || '')}/editar`;
        modal.querySelector('#team-editor-name').value = trigger.dataset.teamName || '';
        modal.querySelector('#team-editor-category').value = trigger.dataset.teamCategory || '';
        modal.querySelector('#team-editor-shield').value = '';
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
  document.querySelectorAll('[data-filter-target]').forEach((input) => {
    const targets = Array.from(document.querySelectorAll(input.dataset.filterTarget));
    const statusFilter = input.parentElement.querySelector('[data-filter-status]');
    const categoryFilter = input.parentElement.querySelector('[data-filter-category]');
    const filter = () => {
      const query = input.value.trim().toLocaleLowerCase();
      const status = statusFilter?.value || '';
      const category = categoryFilter?.value || '';
      targets.forEach((item) => {
        const text = item.dataset.search || item.textContent;
        const matchesText = !query || text.toLocaleLowerCase().includes(query);
        const matchesStatus = !status || item.dataset.matchStatus === status;
        const matchesCategory = !category || item.dataset.category === category;
        item.hidden = !(matchesText && matchesStatus && matchesCategory);
      });
    };
    input.addEventListener('input', filter);
    statusFilter?.addEventListener('change', filter);
    categoryFilter?.addEventListener('change', filter);
  });

  document.querySelectorAll('[data-roster-search]').forEach((input) => {
    const rows = Array.from(input.closest('.admin-roster').querySelectorAll('tbody tr'));
    input.addEventListener('input', () => {
      const query = input.value.trim().toLocaleLowerCase();
      rows.forEach((row) => { row.hidden = !row.textContent.toLocaleLowerCase().includes(query); });
    });
  });
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
  document.querySelectorAll('.dashboard-content form[method="post"]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
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
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        });
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
  });
})();