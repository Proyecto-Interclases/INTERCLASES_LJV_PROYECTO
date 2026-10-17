(function initializeFifaRosters() {
  const rowsByPosition = ['attack', 'midfield', 'goalkeeper'];

  function toCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  }

  function normalizePosition(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function getPositionKey(position) {
    const normalized = normalizePosition(position);
    if (/port|arqu|goalkeeper|\bgk\b|\bpor\b/.test(normalized)) return 'goalkeeper';
    if (/defen|lateral|central|zagu|back|\bdf\b|\bld\b|\bli\b/.test(normalized)) return 'defense';
    if (/medio|volante|midfield|\bmc\b|\bmd\b|\bmi\b/.test(normalized)) return 'midfield';
    if (/delan|atac|extremo|forward|striker|punta|\bdc\b|\bst\b|\bed\b|\bei\b/.test(normalized)) return 'attack';
    return 'other';
  }

  function getPositionLabel(player) {
    if (player.isPlaceholder) return player.posicion || player.lineupRole || 'Jugador';
    return player.posicion || player.lineupRole || 'Jugador';
  }

  function getFormationRow(position) {
    const key = getPositionKey(position);
    return key === 'defense' ? 'midfield' : key;
  }

  function abbreviatePosition(position) {
    const key = getPositionKey(position);
    if (key === 'attack') return 'DEL';
    if (key === 'midfield') return 'MED';
    if (key === 'defense') return 'DEF';
    if (key === 'goalkeeper') return 'POR';
    return 'JUG';
  }

  function createStat(label, value) {
    const stat = document.createElement('span');
    const number = document.createElement('b');
    const caption = document.createElement('span');
    number.textContent = String(toCount(value));
    caption.textContent = label;
    stat.append(number, caption);
    return stat;
  }

  function createPlayerCard(player, isBench) {
    const card = document.createElement('article');
    card.className = `fifa-card${isBench ? ' fifa-card--bench' : ''}${player.isPlaceholder ? ' fifa-card--empty' : ''}`;

    const top = document.createElement('div');
    top.className = 'fifa-card__top';
    const position = document.createElement('span');
    position.textContent = abbreviatePosition(getPositionLabel(player));
    const number = document.createElement('span');
    number.className = 'fifa-card__number';
    number.textContent = `#${toCount(player.numero_camiseta)}`;
    top.append(position, number);

    const portrait = document.createElement('div');
    portrait.className = 'fifa-card__portrait';
    if (player.fotoUrl && !player.isPlaceholder) {
      const image = document.createElement('img');
      image.src = player.fotoUrl;
      image.alt = `Foto de ${player.nombre || 'jugador'}`;
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        portrait.replaceChildren(createPortraitPlaceholder());
      }, { once: true });
      portrait.append(image);
    } else {
      portrait.append(createPortraitPlaceholder());
    }

    const name = document.createElement('strong');
    name.className = 'fifa-card__name';
    name.textContent = player.isPlaceholder ? 'Vacante' : player.nombre || 'Jugador';

    const stats = document.createElement('div');
    stats.className = 'fifa-card__stats';
    stats.append(
      createStat('Goles', player.goles),
      createStat('Asist.', player.asistencias),
      createStat('Ataj.', player.atajadas)
    );
    card.append(top, portrait, name, stats);
    return card;
  }

  function createPortraitPlaceholder() {
    const placeholder = document.createElement('span');
    placeholder.className = 'fifa-card__portrait-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    return placeholder;
  }

  function renderRoster(container) {
    let roster;
    try {
      roster = JSON.parse(container.dataset.fifaSquad || '[]');
    } catch (error) {
      console.error('No se pudo leer la plantilla del equipo.', error);
      return;
    }

    if (!Array.isArray(roster)) {
      console.error('La plantilla recibida tiene un formato no válido.');
      return;
    }

    const starters = roster.filter((player) => player && player.titular);
    const substitutes = roster.filter((player) => player && !player.titular);
    const startersByPosition = new Map(rowsByPosition.map((key) => [key, []]));
    const positionRank = (player) => {
      const index = rowsByPosition.indexOf(getFormationRow(getPositionLabel(player)));
      return index < 0 ? rowsByPosition.length : index;
    };

    starters.forEach((player) => {
      const position = getFormationRow(getPositionLabel(player));
      (startersByPosition.get(position) || startersByPosition.get('midfield')).push(player);
    });

    rowsByPosition.forEach((key) => {
      const row = container.querySelector(`[data-fifa-row="${key}"]`);
      if (!row) return;
      const players = startersByPosition.get(key);
      players.sort((first, second) => toCount(first.numero_camiseta) - toCount(second.numero_camiseta));
      row.hidden = players.length === 0;
      players.forEach((player) => row.append(createPlayerCard(player, false)));
    });

    const bench = container.querySelector('[data-fifa-bench]');
    if (bench) {
      substitutes
        .sort((first, second) => (
          positionRank(first) - positionRank(second)
          || toCount(first.numero_camiseta) - toCount(second.numero_camiseta)
        ))
        .forEach((player) => bench.append(createPlayerCard(player, true)));
    }

    container.classList.add('fifa-squad--ready');
  }

  document.querySelectorAll('[data-fifa-squad]').forEach(renderRoster);
})();
