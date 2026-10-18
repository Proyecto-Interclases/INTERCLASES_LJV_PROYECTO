(() => {
  const list = document.querySelector('[data-roster-list]');
  const addButton = document.querySelector('[data-add-player]');
  if (!list || !addButton) return;

  const maxPlayers = 30;
  function updateRows() {
    const rows = [...list.querySelectorAll('.enrollment-roster-row')];
    rows.forEach((row) => {
      const remove = row.querySelector('[data-remove-player]');
      remove.disabled = rows.length === 1;
      remove.setAttribute('aria-label', `Quitar jugador ${rows.indexOf(row) + 1}`);
    });
    addButton.disabled = rows.length >= maxPlayers;
  }

  addButton.addEventListener('click', () => {
    if (list.children.length >= maxPlayers) return;
    const row = document.createElement('div');
    row.className = 'enrollment-roster-row';
    row.innerHTML = '<label>Nombre del jugador *<input type="text" name="jugadorNombre" maxlength="80" required></label><label>Número *<input type="text" name="jugadorNumero" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" required></label><button class="enrollment-remove-player" type="button" data-remove-player aria-label="Quitar jugador">&times;</button>';
    list.append(row);
    updateRows();
    row.querySelector('input').focus();
  });

  list.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-player]');
    if (!remove || list.children.length <= 1) return;
    remove.closest('.enrollment-roster-row').remove();
    updateRows();
  });
  updateRows();
})();
