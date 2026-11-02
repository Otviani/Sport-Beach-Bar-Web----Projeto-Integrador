// public/js/site.js
// Busca os dados (shows, pratos, bebidas) na API e monta os cards
// nas páginas públicas. Nada aqui grava dados — só lê.

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDateBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function mediaStyle(image) {
  return image
    ? `style="background-image:url('${image}');background-size:cover;background-position:center;"`
    : '';
}

function itemCardHtml(item, fallbackIcon) {
  return `
    <article class="attraction-card">
      <div class="attraction-card__media" ${mediaStyle(item.image)}>
        ${item.image ? '' : fallbackIcon}
      </div>
      <div class="attraction-card__body">
        <h2 class="attraction-card__title">${escapeHtml(item.name)}</h2>
        <p class="attraction-card__text">${escapeHtml(item.description || '')}</p>
        ${item.price ? `<span class="attraction-card__price">R$ ${escapeHtml(item.price)}</span>` : ''}
      </div>
    </article>`;
}

function showCardHtml(show) {
  return `
    <article class="attraction-card">
      <div class="attraction-card__media" ${mediaStyle(show.image)}>
        ${show.image ? '' : '🎤'}
      </div>
      <div class="attraction-card__body">
        <h2 class="attraction-card__title">${escapeHtml(show.title)}</h2>
        <p class="attraction-card__text">${escapeHtml(show.artist)} · ${formatDateBR(show.date)}</p>
      </div>
    </article>`;
}

async function loadItems(category, mountId, fallbackIcon) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  try {
    const res = await fetch(`/api/items?category=${encodeURIComponent(category)}`);
    const items = await res.json();
    mount.innerHTML = items.length
      ? items.map((i) => itemCardHtml(i, fallbackIcon)).join('')
      : '<p class="empty-state">Nenhum item cadastrado ainda. Volte em breve!</p>';
  } catch (e) {
    mount.innerHTML = '<p class="empty-state">Não foi possível carregar os itens agora.</p>';
  }
}

async function loadUpcomingShows(mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  try {
    const res = await fetch('/api/shows');
    const { upcoming } = await res.json();
    mount.innerHTML = upcoming.length
      ? upcoming.map(showCardHtml).join('')
      : '<p class="empty-state">Nenhum show marcado no momento. Fique de olho por aqui!</p>';
  } catch (e) {
    mount.innerHTML = '<p class="empty-state">Não foi possível carregar os shows agora.</p>';
  }
}

async function loadCourt(stageId, areaId) {
  const stage = document.getElementById(stageId);
  if (!stage) return;
  try {
    const res = await fetch('/api/court');
    const court = await res.json();
    stage.innerHTML = courtSvg(court.length, court.width, false);

    const areaEl = document.getElementById(areaId);
    if (areaEl) {
      areaEl.textContent =
        `${formatMeters(court.length)} m × ${formatMeters(court.width)} m — ${courtAreaText(court.length, court.width)} de areia`;
    }
  } catch (e) {
    stage.innerHTML = '<p class="empty-state">Não foi possível carregar as medidas agora.</p>';
  }
}

async function loadSports(mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  try {
    const res = await fetch('/api/sports');
    const sports = await res.json();
    mount.innerHTML = sports.length
      ? sports.map((s) => `
        <article class="attraction-card">
          <div class="attraction-card__body">
            <h2 class="attraction-card__title">${escapeHtml(s.emoji)} ${escapeHtml(s.name)}</h2>
            <p class="attraction-card__text">${escapeHtml(s.description || '')}</p>
          </div>
        </article>`).join('')
      : '<p class="empty-state">Nenhuma modalidade cadastrada ainda.</p>';
  } catch (e) {
    mount.innerHTML = '<p class="empty-state">Não foi possível carregar as modalidades agora.</p>';
  }
}

async function loadLocation(addressId, descriptionId, mapId) {
  try {
    const res = await fetch('/api/location');
    const location = await res.json();

    const addressEl = document.getElementById(addressId);
    if (addressEl) addressEl.textContent = location.address;

    const descEl = document.getElementById(descriptionId);
    if (descEl) descEl.textContent = location.description || '';

    const mapEl = document.getElementById(mapId);
    if (mapEl && window.L) {
      const map = window.L.map(mapId).setView([location.lat, location.lng], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; colaboradores do OpenStreetMap'
      }).addTo(map);
      window.L.marker([location.lat, location.lng])
        .addTo(map)
        .bindPopup(escapeHtml(location.address))
        .openPopup();
    }
  } catch (e) {
    const mapEl = document.getElementById(mapId);
    if (mapEl) mapEl.innerHTML = '<p class="empty-state">Não foi possível carregar o mapa agora.</p>';
  }
}
