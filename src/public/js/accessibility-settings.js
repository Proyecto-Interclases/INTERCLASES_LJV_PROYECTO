(function initializeAccessibilitySettings() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');

  const savedContrast = localStorage.getItem('accessibility-contrast') === 'true';
  const savedHighlightLinks = localStorage.getItem('accessibility-highlight-links') === 'true';
  const savedReading = localStorage.getItem('accessibility-reading') === 'true';
  const savedSpacing = localStorage.getItem('accessibility-spacing') === 'true';
  const savedMotion = localStorage.getItem('accessibility-motion') === 'true';
  const savedCursor = localStorage.getItem('accessibility-cursor') === 'true';
  const savedRuler = localStorage.getItem('accessibility-ruler') === 'true';
  const savedFontSize = parseInt(localStorage.getItem('accessibility-font-size'), 10);

  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.body.dataset.theme = theme;
  if (savedContrast) document.body.classList.add('high-contrast');
  if (savedHighlightLinks) document.body.classList.add('highlight-links');
  if (savedReading) document.body.classList.add('reading-mode');
  if (savedSpacing) document.body.classList.add('extra-spacing');
  if (savedMotion) document.body.classList.add('reduce-motion');
  if (savedCursor) document.body.classList.add('large-cursor');

  if (savedFontSize && !isNaN(savedFontSize)) {
    document.documentElement.style.fontSize = `${savedFontSize}%`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const accessibilityToggle = document.querySelector('#accessibility-toggle');
    const accessibilityPanel = document.querySelector('#accessibility-panel');
    const settingsToggle = document.querySelector('#settings-toggle');
    const settingsPanel = document.querySelector('#settings-panel');
    const themeToggle = document.querySelector('[data-theme-toggle]');

    const contrastToggle = document.querySelector('[data-accessibility="contrast"]');
    const highlightLinksToggle = document.querySelector('[data-accessibility="highlight-links"]');
    const readingToggle = document.querySelector('[data-accessibility="reading"]');
    const spacingToggle = document.querySelector('[data-accessibility="spacing"]');
    const motionToggle = document.querySelector('[data-accessibility="motion"]');
    const cursorToggle = document.querySelector('[data-accessibility="cursor"]');
    const rulerToggle = document.querySelector('[data-accessibility="ruler"]');
    const readingRuler = document.getElementById('accessibility-reading-ruler');
    const fontSizeDisplay = document.querySelector('#font-size-val');

    const root = document.documentElement;
    let baseFontSize = savedFontSize && !isNaN(savedFontSize) ? savedFontSize : 100;

    function updateFontSize(newSize) {
      baseFontSize = Math.min(Math.max(newSize, 80), 140);
      root.style.fontSize = baseFontSize === 100 ? '' : `${baseFontSize}%`;
      if (fontSizeDisplay) fontSizeDisplay.textContent = `${baseFontSize}%`;
      localStorage.setItem('accessibility-font-size', baseFontSize);
    }

    if (fontSizeDisplay) {
      fontSizeDisplay.textContent = `${baseFontSize}%`;
    }

    function setPanel(panel, toggle, isOpen) {
      panel.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
    }

    function closePanels() {
      if (accessibilityPanel && accessibilityToggle) setPanel(accessibilityPanel, accessibilityToggle, false);
      if (settingsPanel && settingsToggle) setPanel(settingsPanel, settingsToggle, false);
    }

    if (!accessibilityToggle || !accessibilityPanel || !settingsToggle || !settingsPanel) return;

    if (themeToggle) themeToggle.checked = theme === 'dark';
    if (contrastToggle) contrastToggle.checked = savedContrast || document.body.classList.contains('high-contrast');
    if (highlightLinksToggle) highlightLinksToggle.checked = savedHighlightLinks || document.body.classList.contains('highlight-links');
    if (readingToggle) readingToggle.checked = savedReading || document.body.classList.contains('reading-mode');
    if (spacingToggle) spacingToggle.checked = savedSpacing || document.body.classList.contains('extra-spacing');
    if (motionToggle) motionToggle.checked = savedMotion || document.body.classList.contains('reduce-motion');
    if (cursorToggle) cursorToggle.checked = savedCursor || document.body.classList.contains('large-cursor');

    function toggleRuler(isActive) {
      if (!readingRuler) return;
      readingRuler.hidden = !isActive;
    }

    if (rulerToggle) {
      rulerToggle.checked = savedRuler;
      toggleRuler(savedRuler);
    }

    window.addEventListener('mousemove', (e) => {
      if (readingRuler && !readingRuler.hidden) {
        readingRuler.style.top = `${e.clientY}px`;
      }
    }, { passive: true });

    accessibilityToggle.addEventListener('click', () => {
      const isOpen = !accessibilityPanel.hidden;
      closePanels();
      setPanel(accessibilityPanel, accessibilityToggle, !isOpen);
    });

    settingsToggle.addEventListener('click', () => {
      const isOpen = !settingsPanel.hidden;
      closePanels();
      setPanel(settingsPanel, settingsToggle, !isOpen);
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.floating-tool')) closePanels();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePanels();
    });

    const fontIncreaseBtn = document.querySelector('[data-font-action="increase"]');
    if (fontIncreaseBtn) {
      fontIncreaseBtn.addEventListener('click', () => {
        updateFontSize(baseFontSize + 10);
      });
    }

    const fontDecreaseBtn = document.querySelector('[data-font-action="decrease"]');
    if (fontDecreaseBtn) {
      fontDecreaseBtn.addEventListener('click', () => {
        updateFontSize(baseFontSize - 10);
      });
    }

    const fontResetBtn = document.querySelector('[data-font-action="reset-font"]');
    if (fontResetBtn) {
      fontResetBtn.addEventListener('click', () => {
        updateFontSize(100);
      });
    }

    if (contrastToggle) {
      contrastToggle.addEventListener('change', () => {
        const isChecked = contrastToggle.checked;
        document.body.classList.toggle('high-contrast', isChecked);
        localStorage.setItem('accessibility-contrast', String(isChecked));
      });
    }

    if (highlightLinksToggle) {
      highlightLinksToggle.addEventListener('change', () => {
        const isChecked = highlightLinksToggle.checked;
        document.body.classList.toggle('highlight-links', isChecked);
        localStorage.setItem('accessibility-highlight-links', String(isChecked));
      });
    }

    if (readingToggle) {
      readingToggle.addEventListener('change', () => {
        const isChecked = readingToggle.checked;
        document.body.classList.toggle('reading-mode', isChecked);
        localStorage.setItem('accessibility-reading', String(isChecked));
      });
    }

    if (spacingToggle) {
      spacingToggle.addEventListener('change', () => {
        const isChecked = spacingToggle.checked;
        document.body.classList.toggle('extra-spacing', isChecked);
        localStorage.setItem('accessibility-spacing', String(isChecked));
      });
    }

    if (motionToggle) {
      motionToggle.addEventListener('change', () => {
        const isChecked = motionToggle.checked;
        document.body.classList.toggle('reduce-motion', isChecked);
        localStorage.setItem('accessibility-motion', String(isChecked));
      });
    }

    if (cursorToggle) {
      cursorToggle.addEventListener('change', () => {
        const isChecked = cursorToggle.checked;
        document.body.classList.toggle('large-cursor', isChecked);
        localStorage.setItem('accessibility-cursor', String(isChecked));
      });
    }

    if (rulerToggle) {
      rulerToggle.addEventListener('change', () => {
        const isChecked = rulerToggle.checked;
        toggleRuler(isChecked);
        localStorage.setItem('accessibility-ruler', String(isChecked));
      });
    }

    if (themeToggle) {
      themeToggle.addEventListener('change', () => {
        const nextTheme = themeToggle.checked ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode', nextTheme === 'dark');
        document.body.dataset.theme = nextTheme;
        localStorage.setItem('theme', nextTheme);
      });
    }

    const resetBtn = document.querySelector('[data-accessibility="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        baseFontSize = 100;
        root.style.fontSize = '';
        if (fontSizeDisplay) fontSizeDisplay.textContent = '100%';

        document.body.classList.remove(
          'high-contrast',
          'highlight-links',
          'reading-mode',
          'extra-spacing',
          'reduce-motion',
          'large-cursor'
        );

        if (contrastToggle) contrastToggle.checked = false;
        if (highlightLinksToggle) highlightLinksToggle.checked = false;
        if (readingToggle) readingToggle.checked = false;
        if (spacingToggle) spacingToggle.checked = false;
        if (motionToggle) motionToggle.checked = false;
        if (cursorToggle) cursorToggle.checked = false;
        if (rulerToggle) rulerToggle.checked = false;
        toggleRuler(false);

        localStorage.removeItem('accessibility-contrast');
        localStorage.removeItem('accessibility-highlight-links');
        localStorage.removeItem('accessibility-reading');
        localStorage.removeItem('accessibility-spacing');
        localStorage.removeItem('accessibility-motion');
        localStorage.removeItem('accessibility-cursor');
        localStorage.removeItem('accessibility-ruler');
        localStorage.removeItem('accessibility-font-size');
      });
    }
  });
})();
