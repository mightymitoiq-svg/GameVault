(() => {
  'use strict';

  const STORAGE_KEY = 'gamevault.library.v1';
  const SORTERS = {
    recent: (a, b) => b.addedAt - a.addedAt,
    name: (a, b) => a.title.localeCompare(b.title),
    mostPlayed: (a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title),
    lastPlayed: (a, b) => b.lastPlayed - a.lastPlayed || a.title.localeCompare(b.title),
  };
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  const $ = (sel) => document.querySelector(sel);
  const el = {
    home: $('#home'),
    addGames: $('#add-games'),
    gameGrid: $('#game-grid'),
    gameList: $('#game-list'),
    installedList: $('#installed-list'),
    statsTotal: $('#stat-total'),
    statsPlays: $('#stat-plays'),
    statsMostPlayed: $('#stat-most-played'),
    search: $('#search'),
    sort: $('#sort'),
    viewToggle: $('#view-toggle'),
    addBtn: $('#add-btn'),
    doneAdd: $('#done-add'),
    cancelAdd: $('#cancel-add'),
    selectedCount: $('#selected-count'),
    empty: $('#empty'),
  };

  let library = loadLibrary();
  let installedGames = [];
  let playStats = {};
  let view = 'home';
  let sortKey = 'recent';
  let gridMode = true;
  let query = '';
  let selectedPackages = new Set();

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function loadLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLibrary() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }

  function loadPlayStats() {
    try {
      const parsed = JSON.parse(Android.getAllPlayStats() || '{}');
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  function syncStats() {
    playStats = loadPlayStats();
    for (const game of library) {
      const stats = playStats[game.packageName] || {};
      game.playCount = stats.count || 0;
      game.lastPlayed = stats.lastPlayed || 0;
    }
    saveLibrary();
  }

  function installedPackages() {
    return new Set(library.map((g) => g.packageName));
  }

  function renderHome() {
    el.home.hidden = false;
    el.addGames.hidden = true;

    syncStats();

    const totalPlays = library.reduce((sum, g) => sum + (g.playCount || 0), 0);
    let mostPlayedName = '–';
    let mostPlayedCount = 0;
    for (const g of library) {
      if ((g.playCount || 0) > mostPlayedCount) {
        mostPlayedCount = g.playCount;
        mostPlayedName = g.title;
      }
    }
    el.statsTotal.textContent = library.length;
    el.statsPlays.textContent = totalPlays;
    el.statsMostPlayed.textContent = mostPlayedName;

    const sorted = [...library]
      .filter((g) => !query || g.title.toLowerCase().includes(query))
      .sort(SORTERS[sortKey]);

    const container = gridMode ? el.gameGrid : el.gameList;
    const other = gridMode ? el.gameList : el.gameGrid;
    other.innerHTML = '';
    container.innerHTML = sorted.map((g) => {
      const stats = playStats[g.packageName] || {};
      const count = stats.count || 0;
      const last = stats.lastPlayed || 0;
      const lastPlayed = last
        ? new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'Never';
      const iconUrl = g.iconBase64 ? `data:image/png;base64,${g.iconBase64}` : '';
      return `
        <div class="game-card" data-pkg="${esc(g.packageName)}">
          <img class="game-icon" src="${esc(iconUrl)}" alt="${esc(g.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="game-avatar" style="display:none">${initials(g.title)}</div>
          <div class="game-info">
            <div class="game-title">${esc(g.title)}</div>
            <div class="game-meta">${count} play${count !== 1 ? 's' : ''} · Last: ${lastPlayed}</div>
          </div>
          <div class="game-launch">▶</div>
        </div>`;
    }).join('');

    el.empty.hidden = library.length > 0;
    el.empty.textContent = library.length
      ? 'No games match your search.'
      : 'Your vault is empty. Tap + to add games from your device.';
  }

  function renderAdd() {
    el.home.hidden = true;
    el.addGames.hidden = false;

    const inLibrary = installedPackages();
    const filtered = installedGames.filter((g) =>
      !inLibrary.has(g.packageName) &&
      (!query || g.label.toLowerCase().includes(query))
    );
    const sorted = [...filtered].sort(SORTERS[sortKey]);

    el.installedList.innerHTML = sorted.map((g) => {
      const checked = selectedPackages.has(g.packageName) ? 'checked' : '';
      const iconUrl = g.iconBase64 ? `data:image/png;base64,${g.iconBase64}` : '';
      return `
        <label class="install-row" data-pkg="${esc(g.packageName)}">
          <input type="checkbox" class="install-checkbox" value="${esc(g.packageName)}" ${checked}>
          <img class="install-icon" src="${esc(iconUrl)}" alt="${esc(g.label)}" onerror="this.style.display='none'">
          <div class="install-title">${esc(g.label)}</div>
          <div class="install-pkg">${esc(g.packageName)}</div>
          <div class="install-check">✓</div>
        </label>`;
    }).join('');

    el.selectedCount.textContent = selectedPackages.size;
  }

  function addSelected() {
    const now = Date.now();
    for (const pkg of selectedPackages) {
      const installed = installedGames.find((g) => g.packageName === pkg);
      if (installed && !library.some((g) => g.packageName === pkg)) {
        library.push({
          id: crypto.randomUUID(),
          packageName: pkg,
          title: installed.label,
          iconBase64: installed.iconBase64,
          addedAt: now,
          playCount: 0,
          lastPlayed: 0,
        });
      }
    }
    saveLibrary();
    selectedPackages.clear();
    view = 'home';
    renderHome();
  }

  function launchGame(packageName) {
    if (Android) {
      Android.vibrate(15);
      Android.recordPlay(packageName);
      Android.launchGame(packageName);
    }
  }

  function initials(title) {
    const [first = '?', second] = title.trim().split(/\s+/);
    return (second ? first[0] + second[0] : first.slice(0, 2)).toUpperCase();
  }

  function navigateHome() {
    view = 'home';
    selectedPackages.clear();
    renderHome();
  }

  function navigateAdd() {
    view = 'add';
    renderAdd();
  }

  function setupHomeEvents() {
    el.viewToggle.addEventListener('click', () => {
      gridMode = !gridMode;
      el.viewToggle.textContent = gridMode ? '⌘ List' : '⌘ Grid';
      renderHome();
    });
    el.addBtn.addEventListener('click', navigateAdd);
    el.search.addEventListener('input', (e) => {
      query = e.target.value.toLowerCase();
      if (view === 'home') renderHome();
      else renderAdd();
    });
    el.sort.addEventListener('change', (e) => {
      sortKey = e.target.value;
      if (view === 'home') renderHome();
      else renderAdd();
    });

    el.gameGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.game-card');
      if (card) launchGame(card.dataset.pkg);
    });
    el.gameList.addEventListener('click', (e) => {
      const card = e.target.closest('.game-card');
      if (card) launchGame(card.dataset.pkg);
    });
  }

  function setupAddEvents() {
    el.doneAdd.addEventListener('click', addSelected);
    el.cancelAdd.addEventListener('click', navigateHome);

    el.installedList.addEventListener('click', (e) => {
      const row = e.target.closest('.install-row');
      if (!row) return;
      const pkg = row.dataset.pkg;
      const checkbox = row.querySelector('.install-checkbox');
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) selectedPackages.add(pkg);
      else selectedPackages.delete(pkg);
      renderAdd();
    });
  }

  function init() {
    if (window.Android) {
      try {
        const json = Android.getInstalledGames();
        installedGames = JSON.parse(json || '[]');
      } catch {
        installedGames = [];
      }
    }
    syncStats();
    setupHomeEvents();
    setupAddEvents();
    renderHome();
  }

  init();
})();
