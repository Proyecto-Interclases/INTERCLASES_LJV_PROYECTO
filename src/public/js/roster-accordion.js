function updateRosterAccordionLabel(accordion) {
  const label = accordion.querySelector('[data-roster-toggle-label]');
  if (label) label.textContent = accordion.open ? 'Ocultar plantilla' : 'Desplegar plantilla';
}

document.querySelectorAll('[data-roster-accordion]').forEach(updateRosterAccordionLabel);
document.addEventListener('toggle', (event) => {
  if (event.target.matches('[data-roster-accordion]')) updateRosterAccordionLabel(event.target);
}, true);
