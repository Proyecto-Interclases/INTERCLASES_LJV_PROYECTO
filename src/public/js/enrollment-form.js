(() => {
  const list = document.querySelector('[data-roster-list]');
  const addButton = document.querySelector('[data-add-player]');
  if (!list || !addButton) return;

  const form = list.closest('form');
  const minPlayers = 5;
  const maxPlayers = 30;
  const personNamePattern = /^(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*$/u;

  function validatePersonName(input) {
    const value = input.value.normalize('NFC').replace(/^ +| +$/g, '');
    input.setCustomValidity(
      value && personNamePattern.test(value)
        ? ''
        : 'Ingresa un nombre que contenga únicamente letras y espacios.'
    );
  }

  function updateRows() {
    const rows = [...list.querySelectorAll('.enrollment-roster-row')];
    rows.forEach((row) => {
      const remove = row.querySelector('[data-remove-player]');
      remove.disabled = rows.length <= minPlayers;
      remove.setAttribute('aria-label', `Quitar jugador ${rows.indexOf(row) + 1}`);
    });
    addButton.disabled = rows.length >= maxPlayers;
    form.querySelectorAll('[data-person-name]').forEach(validatePersonName);
  }

  addButton.addEventListener('click', () => {
    if (list.children.length >= maxPlayers) return;
    const row = document.createElement('div');
    row.className = 'enrollment-roster-row';
    row.innerHTML = '<label>Nombre del jugador *<input type="text" name="jugadorNombre" maxlength="80" data-person-name required></label><label>Número *<input type="text" name="jugadorNumero" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" required></label><button class="enrollment-remove-player" type="button" data-remove-player aria-label="Quitar jugador">&times;</button>';
    list.append(row);
    updateRows();
    row.querySelector('input').focus();
  });

  form.addEventListener('input', (event) => {
    const input = event.target.closest('[data-person-name]');
    if (input) validatePersonName(input);
  });

  list.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-player]');
    if (!remove || list.children.length <= minPlayers) return;
    remove.closest('.enrollment-roster-row').remove();
    updateRows();
  });

  form.addEventListener('submit', (event) => {
    const rows = list.querySelectorAll('.enrollment-roster-row');
    if (rows.length < minPlayers) {
      event.preventDefault();
      const firstName = list.querySelector('[data-person-name]');
      firstName.setCustomValidity(`La plantilla debe incluir al menos ${minPlayers} integrantes.`);
      firstName.reportValidity();
      return;
    }
    form.querySelectorAll('[data-person-name]').forEach(validatePersonName);
    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
    }
  });

  updateRows();
})();
