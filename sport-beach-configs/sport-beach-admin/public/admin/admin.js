// public/admin/admin.js
// Lógica do painel: login, listar/criar/editar/excluir itens (fotos do
// espaço, quadra, pratos, bebidas, shows), além de salvar as dimensões da quadra,
// os esportes praticados e a localização do bar — tudo via fetch para a API protegida.

const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDateBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// -----------------------------------------------------------
// Sessão / login
// -----------------------------------------------------------
async function checkSession() {
  const res = await fetch('/api/admin/session');
  const { isAdmin } = await res.json();
  if (isAdmin) {
    showAdmin();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  adminScreen.classList.add('hidden');
}

function showAdmin() {
  loginScreen.classList.add('hidden');
  adminScreen.classList.remove('hidden');
  loadItems('espaco', 'espacos-list');
  loadItems('prato', 'pratos-list');
  loadItems('bebida', 'bebidas-list');
  loadShows();
  loadItems('quadra', 'quadras-list');
  loadCourtForm();
  loadSportsAdmin();
  loadLocationForm();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Não foi possível entrar.';
      return;
    }
    document.getElementById('password').value = '';
    showAdmin();
  } catch (err) {
    errorEl.textContent = 'Erro de conexão com o servidor.';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// -----------------------------------------------------------
// Abas
// -----------------------------------------------------------
document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.add('hidden'));
    tab.classList.add('is-active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// -----------------------------------------------------------
// Shows
// -----------------------------------------------------------
const showForm = document.getElementById('show-form');
const showIdField = document.getElementById('show-id');
const showCancelBtn = document.getElementById('show-cancel');

async function loadShows() {
  const list = document.getElementById('shows-list');
  list.innerHTML = '<p class="admin-empty">Carregando...</p>';

  const res = await fetch('/api/shows');
  const { upcoming, past } = await res.json();
  const all = [...upcoming, ...past];

  if (!all.length) {
    list.innerHTML = '<p class="admin-empty">Nenhum show cadastrado ainda.</p>';
    return;
  }

  list.innerHTML = all.map((show) => `
    <div class="admin-list-item">
      <div class="admin-list-item__thumb" ${show.image ? `style="background-image:url('${show.image}')"` : ''}>
        ${show.image ? '' : '🎤'}
      </div>
      <div class="admin-list-item__info">
        <p class="admin-list-item__title">${escapeHtml(show.title)}</p>
        <p class="admin-list-item__meta">${escapeHtml(show.artist)} · ${formatDateBR(show.date)}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost" data-edit-show="${show.id}">Editar</button>
        <button class="btn btn--danger" data-delete-show="${show.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-show]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const show = all.find((s) => s.id === btn.dataset.editShow);
      fillShowForm(show);
    });
  });

  list.querySelectorAll('[data-delete-show]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este show? Essa ação não pode ser desfeita.')) return;
      await fetch(`/api/admin/shows/${btn.dataset.deleteShow}`, { method: 'DELETE' });
      loadShows();
    });
  });
}

function fillShowForm(show) {
  showIdField.value = show.id;
  document.getElementById('show-title').value = show.title;
  document.getElementById('show-artist').value = show.artist;
  document.getElementById('show-date').value = show.date;
  document.getElementById('show-form-title').textContent = 'Editar show';
  showCancelBtn.classList.remove('hidden');
  showForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetShowForm() {
  showForm.reset();
  showIdField.value = '';
  document.getElementById('show-form-title').textContent = 'Novo show';
  showCancelBtn.classList.add('hidden');
  document.getElementById('show-form-error').textContent = '';
}

showCancelBtn.addEventListener('click', resetShowForm);

showForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('show-form-error');
  errorEl.textContent = '';

  const formData = new FormData();
  formData.append('title', document.getElementById('show-title').value);
  formData.append('artist', document.getElementById('show-artist').value);
  formData.append('date', document.getElementById('show-date').value);
  const imageFile = document.getElementById('show-image').files[0];
  if (imageFile) formData.append('image', imageFile);

  const id = showIdField.value;
  const url = id ? `/api/admin/shows/${id}` : '/api/admin/shows';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, { method, body: formData });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.error || 'Não foi possível salvar o show.';
    return;
  }

  resetShowForm();
  loadShows();
});

// -----------------------------------------------------------
// Itens (fotos do espaço, pratos e bebidas) — lógica compartilhada
// -----------------------------------------------------------
const ITEM_CONFIG = {
  espaco: { prefix: 'espaco', listId: 'espacos-list', icon: '🏖️', newLabel: 'Nova foto do espaço', editLabel: 'Editar foto do espaço', hasPrice: false },
  quadra: { prefix: 'quadra', listId: 'quadras-list', icon: '🏐', newLabel: 'Nova foto da quadra', editLabel: 'Editar foto da quadra', hasPrice: false },
  prato: { prefix: 'prato', listId: 'pratos-list', icon: '🍽️', newLabel: 'Novo prato', editLabel: 'Editar prato', hasPrice: true },
  bebida: { prefix: 'bebida', listId: 'bebidas-list', icon: '🥤', newLabel: 'Nova bebida', editLabel: 'Editar bebida', hasPrice: true }
};

const itemHandlers = {};

function setupItemForm(category) {
  const config = ITEM_CONFIG[category];
  const { prefix } = config;
  const form = document.getElementById(`${prefix}-form`);
  const idField = document.getElementById(`${prefix}-id`);
  const cancelBtn = document.getElementById(`${prefix}-cancel`);
  const errorEl = document.getElementById(`${prefix}-form-error`);
  const formTitle = document.getElementById(`${prefix}-form-title`);
  const priceField = document.getElementById(`${prefix}-price`); // pode não existir (ex: espaço)

  function resetForm() {
    form.reset();
    idField.value = '';
    formTitle.textContent = config.newLabel;
    cancelBtn.classList.add('hidden');
    errorEl.textContent = '';
  }

  cancelBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const formData = new FormData();
    formData.append('category', category);
    formData.append('name', document.getElementById(`${prefix}-name`).value);
    formData.append('description', document.getElementById(`${prefix}-description`).value);
    if (priceField) formData.append('price', priceField.value);
    const imageFile = document.getElementById(`${prefix}-image`).files[0];
    if (imageFile) formData.append('image', imageFile);

    const id = idField.value;
    const url = id ? `/api/admin/items/${id}` : '/api/admin/items';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Não foi possível salvar o item.';
      return;
    }

    resetForm();
    loadItems(category, config.listId);
  });

  return {
    resetForm,
    fillForm: (item) => {
      idField.value = item.id;
      document.getElementById(`${prefix}-name`).value = item.name;
      document.getElementById(`${prefix}-description`).value = item.description || '';
      if (priceField) priceField.value = item.price || '';
      formTitle.textContent = config.editLabel;
      cancelBtn.classList.remove('hidden');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
}

Object.keys(ITEM_CONFIG).forEach((category) => {
  itemHandlers[category] = setupItemForm(category);
});

async function loadItems(category, listId) {
  const config = ITEM_CONFIG[category];
  const list = document.getElementById(listId);
  list.innerHTML = '<p class="admin-empty">Carregando...</p>';

  const res = await fetch(`/api/items?category=${encodeURIComponent(category)}`);
  const items = await res.json();

  if (!items.length) {
    list.innerHTML = '<p class="admin-empty">Nenhum item cadastrado ainda.</p>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="admin-list-item">
      <div class="admin-list-item__thumb" ${item.image ? `style="background-image:url('${item.image}')"` : ''}>
        ${item.image ? '' : config.icon}
      </div>
      <div class="admin-list-item__info">
        <p class="admin-list-item__title">${escapeHtml(item.name)}</p>
        <p class="admin-list-item__meta">${item.price ? `R$ ${escapeHtml(item.price)}` : escapeHtml(item.description || '')}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost" data-edit-item="${item.id}">Editar</button>
        <button class="btn btn--danger" data-delete-item="${item.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((i) => i.id === btn.dataset.editItem);
      itemHandlers[category].fillForm(item);
    });
  });

  list.querySelectorAll('[data-delete-item]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este item? Essa ação não pode ser desfeita.')) return;
      await fetch(`/api/admin/items/${btn.dataset.deleteItem}`, { method: 'DELETE' });
      loadItems(category, listId);
    });
  });
}

// -----------------------------------------------------------
// Dimensões da quadra (Esportes e Lazer)
// -----------------------------------------------------------
const courtForm = document.getElementById('court-form');
const courtStage = document.getElementById('court-stage-admin');
const courtLengthInput = document.getElementById('court-length');
const courtWidthInput = document.getElementById('court-width');
const courtState = { length: 16, width: 8 };

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function renderCourtAdmin() {
  courtStage.innerHTML = courtSvg(courtState.length, courtState.width, true);
  document.getElementById('court-area-admin').textContent =
    `Área: ${courtAreaText(courtState.length, courtState.width)}`;
}

function syncCourtInputs() {
  courtLengthInput.value = courtState.length;
  courtWidthInput.value = courtState.width;
}

async function loadCourtForm() {
  const res = await fetch('/api/court');
  const court = await res.json();
  courtState.length = court.length;
  courtState.width = court.width;
  syncCourtInputs();
  renderCourtAdmin();
}

// Digitar nas caixas atualiza o desenho na hora (sem reescrever o que está sendo digitado)
courtLengthInput.addEventListener('input', () => {
  courtState.length = clampNumber(Number(courtLengthInput.value) || COURT.LEN[0], COURT.LEN[0], COURT.LEN[1]);
  renderCourtAdmin();
});
courtWidthInput.addEventListener('input', () => {
  courtState.width = clampNumber(Number(courtWidthInput.value) || COURT.WID[0], COURT.WID[0], COURT.WID[1]);
  renderCourtAdmin();
});
// Ao sair do campo, mostra o valor já ajustado aos limites
courtLengthInput.addEventListener('change', syncCourtInputs);
courtWidthInput.addEventListener('change', syncCourtInputs);

// Arrastar a bolinha laranja
let draggingCourt = false;

courtStage.addEventListener('pointerdown', (e) => {
  if (e.target.id === 'court-handle') {
    draggingCourt = true;
    e.preventDefault();
  }
});

window.addEventListener('pointermove', (e) => {
  if (!draggingCourt) return;
  const svg = courtStage.querySelector('svg');
  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;
  const p = point.matrixTransform(svg.getScreenCTM().inverse());

  // arredonda para múltiplos de 0,5 m
  courtState.length = clampNumber(Math.round(((p.x - COURT.X0) / COURT.P) * 2) / 2, COURT.LEN[0], COURT.LEN[1]);
  courtState.width = clampNumber(Math.round(((p.y - COURT.Y0) / COURT.P) * 2) / 2, COURT.WID[0], COURT.WID[1]);
  syncCourtInputs();
  renderCourtAdmin();
});

window.addEventListener('pointerup', () => { draggingCourt = false; });

courtForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('court-form-error');
  const successEl = document.getElementById('court-form-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  const res = await fetch('/api/admin/court', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ length: courtState.length, width: courtState.width })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.error || 'Não foi possível salvar as dimensões.';
    return;
  }

  successEl.textContent = 'Dimensões salvas com sucesso!';
  setTimeout(() => { successEl.textContent = ''; }, 3000);
});

// -----------------------------------------------------------
// Esportes praticados na quadra
// -----------------------------------------------------------
const sportForm = document.getElementById('sport-form');

async function loadSportsAdmin() {
  const list = document.getElementById('sports-admin-list');
  const res = await fetch('/api/sports');
  const sports = await res.json();

  if (!sports.length) {
    list.innerHTML = '<p class="admin-empty">Nenhum esporte cadastrado ainda.</p>';
    return;
  }

  list.innerHTML = sports.map((sport) => `
    <div class="sport-item">
      <span class="sport-item__emoji">${escapeHtml(sport.emoji)}</span>
      <div>
        <span class="sport-item__name">${escapeHtml(sport.name)}</span>
        <p class="sport-item__desc">${escapeHtml(sport.description || '')}</p>
      </div>
      <button type="button" class="sport-item__remove" data-remove-sport="${sport.id}"
              aria-label="Remover ${escapeHtml(sport.name)}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-remove-sport]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este esporte? Essa ação não pode ser desfeita.')) return;
      await fetch(`/api/admin/sports/${btn.dataset.removeSport}`, { method: 'DELETE' });
      loadSportsAdmin();
    });
  });
}

sportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('sport-form-error');
  errorEl.textContent = '';

  const res = await fetch('/api/admin/sports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emoji: document.getElementById('sport-emoji').value,
      name: document.getElementById('sport-name').value,
      description: document.getElementById('sport-description').value
    })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.error || 'Não foi possível adicionar o esporte.';
    return;
  }

  sportForm.reset();
  document.getElementById('sport-emoji').value = '🏖️';
  loadSportsAdmin();
});

// -----------------------------------------------------------
// Localização
// -----------------------------------------------------------
const locationForm = document.getElementById('location-form');

async function loadLocationForm() {
  const res = await fetch('/api/location');
  const location = await res.json();

  document.getElementById('location-address').value = location.address || '';
  document.getElementById('location-lat').value = location.lat ?? '';
  document.getElementById('location-lng').value = location.lng ?? '';
  document.getElementById('location-description').value = location.description || '';
}

locationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('location-form-error');
  const successEl = document.getElementById('location-form-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  const payload = {
    address: document.getElementById('location-address').value,
    lat: document.getElementById('location-lat').value,
    lng: document.getElementById('location-lng').value,
    description: document.getElementById('location-description').value
  };

  const res = await fetch('/api/admin/location', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.error || 'Não foi possível salvar a localização.';
    return;
  }

  successEl.textContent = 'Localização salva com sucesso!';
  setTimeout(() => { successEl.textContent = ''; }, 3000);
});

// -----------------------------------------------------------
checkSession();
