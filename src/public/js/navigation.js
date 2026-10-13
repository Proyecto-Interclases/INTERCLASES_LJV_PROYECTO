(function initializeNavigation() {
  function getNavigation() {
    return {
      toggle: document.querySelector('#navToggle'),
      menu: document.querySelector('#primary-navigation')
    };
  }

  function closeMenu() {
    const { toggle, menu } = getNavigation();
    if (!toggle || !menu) return;

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú de navegación');
    menu.classList.remove('is-open');
  }

  document.addEventListener('click', (event) => {
    const { toggle, menu } = getNavigation();
    if (!toggle || !menu) return;

    const target = event.target;
    if (target instanceof Element && target.closest('#navToggle') === toggle) {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Abrir menú de navegación' : 'Cerrar menú de navegación');
      menu.classList.toggle('is-open', !isOpen);
      return;
    }

    if (target instanceof Element && target.closest('#primary-navigation a')) {
      closeMenu();
      return;
    }

    if (!menu.contains(target) && !toggle.contains(target)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) closeMenu();
  });
})();