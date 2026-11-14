(() => {
  'use strict';

  const STORAGE_KEY = 'gamevault.games.v1';
  const STATUSES = {
    playing: 'Playing',
    backlog: 'Backlog',
    completed: 'Completed',
    dropped: 'Dropped',
  };
  const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Other'];
  const SORTERS = {
    recent: (a, b) => b.addedAt - a.addedAt,
    title: (a, b) => a.title.localeCompare(b.title),
    rating: (a, b) => (b.rating - a.rating) || a.title.localeCompare(b.title),
  };
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  const $ = (sel) => document.querySelector(sel);
  const el = {
    list: $('#list'),
    empty: $('#empty'),
    stats: $('#stats'),
    filters: $('#filters'),
    search: $('#search'),
    sort: $('#sort'),
    modal: $('#modal'),
    modalTitle: $('#modal-title'),
    form: $('#game-form'),
    deleteBtn: $('#delete-btn'),
  };

  let games = loadGames();
  let filter = 'all';
  let editingId = null;
  let modalOpen = false;
  let disarmTimer = null;

  const field = (name) => el.form.elements.namedItem(name);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function loadGames() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  }

  function hueOf(text) {
    let hash = 0;
    for (const ch of text) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return hash % 360;
  }

  function initials(title) {
    const [first = '?', second] = title.trim().split(/\s+/);
    return (second ? first[0] + second[0] : first.slice(0, 2)).toUpperCase();
  }

  function fillSelect(select, options) {
    select.innerHTML = options
      .map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`)
      .join('');
  }

  function visibleGames() {
    const q = el.search.value.trim().toLowerCase();
    return games
      .filter((g) => filter === 'all' || g.status === filter)
      .filter((g) => !q || [g.title, g.genre, g.platform].some((v) => (v || '').toLowerCase().includes(q)))
      .sort(SORTERS[el.sort.value]);
  }

  function renderStats() {
    const rated = games.filter((g) => g.rating > 0);
    const avg = rated.length
      ? (rated.reduce((sum, g) => sum + g.rating, 0) / rated.length).toFixed(1)
      : '–';
    const countOf = (status) => games.filter((g) => g.status === status).length;
    el.stats.innerHTML = [
      ['Total', games.length],
      ['Playing', countOf('playing')],
      ['Completed', countOf('completed')],
      ['Avg rating', avg],
    ]
      .map(([label, value]) => `
        <div class="stat">
          <span class="stat-value">${value}</span>
          <span class="stat-label">${label}</span>
        </div>`)
      .join('');
  }

  function renderFilters() {
    el.filters.innerHTML = [['all', 'All'], ...Object.entries(STATUSES)]
      .map(([key, label]) =>
        `<button type="button" class="chip" data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`)
      .join('');
  }

  function cardHtml(g) {
    const stars = g.rating
      ? `<span class="stars" aria-label="${g.rating} of 5 stars">${'★'.repeat(g.rating)}<span class="off">${'★'.repeat(5 - g.rating)}</span></span>`
      : '<span class="muted">Unrated</span>';
    const meta = [g.platform, g.genre].filter(Boolean).join(' · ');
    return `
      <li class="card" data-id="${esc(g.id)}">
        <div class="cover" style="--hue:${hueOf(g.title)}">${esc(initials(g.title))}</div>
        <div class="info">
          <div class="title">${esc(g.title)}</div>
          <div class="meta">${esc(meta)}</div>
          <div class="row">
            <span class="badge s-${esc(g.status)}">${esc(STATUSES[g.status])}</span>
            ${stars}
          </div>
        </div>
      </li>`;
  }

  function render() {
    renderStats();
    renderFilters();
    const items = visibleGames();
    el.list.innerHTML = items.map(cardHtml).join('');
    el.empty.hidden = items.length > 0;
    el.empty.textContent = games.length
      ? 'No games match these filters.'
      : 'Your vault is empty. Tap + to add your first game.';
  }

  function showModal() {
    if (!modalOpen) history.pushState({ modal: true }, '');
    modalOpen = true;
    el.modal.hidden = false;
  }

  function hideModal() {
    modalOpen = false;
    el.modal.hidden = true;
  }

  function closeModal() {
    if (!modalOpen) return;
    if (history.state && history.state.modal) history.back();
    else hideModal();
  }

  function resetDeleteButton() {
    clearTimeout(disarmTimer);
    delete el.deleteBtn.dataset.armed;
    el.deleteBtn.textContent = 'Delete';
  }

  function openEditor(id) {
    const game = games.find((g) => g.id === id);
    editingId = game ? game.id : null;
    const values = game ?? { title: '', platform: 'PC', genre: '', status: 'backlog', rating: 0, notes: '' };
    for (const key of ['title', 'platform', 'genre', 'status', 'rating', 'notes']) {
      field(key).value = String(values[key] ?? '');
    }
    el.modalTitle.textContent = game ? 'Edit game' : 'Add game';
    el.deleteBtn.hidden = !game;
    resetDeleteButton();
    showModal();
    field('title').focus();
  }

  function saveForm(event) {
    event.preventDefault();
    const title = field('title').value.trim();
    if (!title) {
      field('title').focus();
      return;
    }
    const data = {
      title,
      platform: field('platform').value,
      genre: field('genre').value.trim(),
      status: field('status').value,
      rating: Number(field('rating').value),
      notes: field('notes').value.trim(),
    };
    if (editingId) {
      games = games.map((g) => (g.id === editingId ? { ...g, ...data } : g));
    } else {
      games.push({ id: crypto.randomUUID(), addedAt: Date.now(), ...data });
    }
    persist();
    closeModal();
    render();
  }

  function onDeleteClick() {
    if (!el.deleteBtn.dataset.armed) {
      el.deleteBtn.dataset.armed = 'true';
      el.deleteBtn.textContent = 'Tap again to delete';
      disarmTimer = setTimeout(resetDeleteButton, 3000);
      return;
    }
    games = games.filter((g) => g.id !== editingId);
    persist();
    resetDeleteButton();
    closeModal();
    render();
  }

  fillSelect(field('platform'), PLATFORMS.map((p) => [p, p]));
  fillSelect(field('status'), Object.entries(STATUSES));
  fillSelect(field('rating'), [0, 1, 2, 3, 4, 5].map((n) => [String(n), n ? '★'.repeat(n) : 'Unrated']));

  el.filters.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-filter]');
    if (!btn) return;
    filter = btn.dataset.filter;
    render();
  });
  el.list.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (card) openEditor(card.dataset.id);
  });
  el.search.addEventListener('input', render);
  el.sort.addEventListener('change', render);
  $('#add-btn').addEventListener('click', () => openEditor(null));
  $('#close-btn').addEventListener('click', closeModal);
  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) closeModal();
  });
  el.form.addEventListener('submit', saveForm);
  el.deleteBtn.addEventListener('click', onDeleteClick);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
  window.addEventListener('popstate', () => {
    if (modalOpen) hideModal();
  });

  render();
})();
