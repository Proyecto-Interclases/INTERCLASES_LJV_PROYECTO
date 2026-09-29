(function initializeGalleryCarousel() {
  const carousel = document.querySelector('[data-gallery-carousel]');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('[data-gallery-slide]'));
  const indicators = Array.from(carousel.querySelectorAll('[data-gallery-indicator]'));
  const previousButton = carousel.querySelector('[data-gallery-previous]');
  const nextButton = carousel.querySelector('[data-gallery-next]');
  const viewport = carousel.querySelector('[data-gallery-viewport]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (slides.length < 2) return;

  let activeIndex = 0;
  let autoplayTimer = null;
  let pointerStartX = null;

  function showSlide(nextIndex) {
    activeIndex = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
    });

    indicators.forEach((indicator, index) => {
      const isActive = index === activeIndex;
      indicator.classList.toggle('is-active', isActive);
      indicator.setAttribute('aria-current', String(isActive));
    });
  }

  function stopAutoplay() {
    if (autoplayTimer) window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function startAutoplay() {
    stopAutoplay();
    if (reducedMotion.matches || document.hidden || carousel.matches(':hover') || carousel.contains(document.activeElement)) return;
    autoplayTimer = window.setInterval(() => showSlide(activeIndex + 1), 5000);
  }

  previousButton?.addEventListener('click', () => {
    showSlide(activeIndex - 1);
    startAutoplay();
  });

  nextButton?.addEventListener('click', () => {
    showSlide(activeIndex + 1);
    startAutoplay();
  });

  indicators.forEach((indicator) => {
    indicator.addEventListener('click', () => {
      showSlide(Number(indicator.dataset.galleryIndicator));
      startAutoplay();
    });
  });

  carousel.addEventListener('pointerenter', stopAutoplay);
  carousel.addEventListener('pointerleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', (event) => {
    if (!carousel.contains(event.relatedTarget)) startAutoplay();
  });

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(activeIndex - 1);
      startAutoplay();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(activeIndex + 1);
      startAutoplay();
    }
  });

  viewport?.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
  }, { passive: true });

  viewport?.addEventListener('pointerup', (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) < 45) return;
    showSlide(activeIndex + (distance < 0 ? 1 : -1));
    startAutoplay();
  }, { passive: true });

  viewport?.addEventListener('pointercancel', () => {
    pointerStartX = null;
  });

  document.addEventListener('visibilitychange', startAutoplay);
  reducedMotion.addEventListener('change', startAutoplay);
  document.body.addEventListener('accessibility-motion-change', startAutoplay);
  startAutoplay();
})();
