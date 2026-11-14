/*
 * GameVault V1
 * Local-first universal gaming library.
 *
 * All user data lives in localStorage; artwork lives in IndexedDB and is
 * referenced by key so records stay small and backups stay portable.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = 'gamevault.data.v2';
  const LEGACY_KEY = 'gamevault.games.v1';
  const SCHEMA = 2;

  const PLATFORMS = ['Android', 'Windows PC', 'Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Cloud gaming', 'Other'];
  const STATUSES = [
    ['backlog', 'Backlog'],
    ['playing', 'Playing'],
    ['completed', 'Completed'],
    ['onhold', 'On hold'],
    ['dropped', 'Dropped'],
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES);
  const VIEWS = [['grid', 'Grid'], ['list', 'List'], ['compact', 'Compact']];
  const SORTS = [
    ['added', 'Recently added'],
    ['title', 'Alphabetical'],
    ['played', 'Recently played'],
    ['launches', 'Most played'],
    ['released', 'Release date'],
  ];
  const ACCENTS = [['violet', 'Electric violet'], ['cyan', 'Arctic cyan'], ['magenta', 'Neon magenta']];

  const ICONS = {
    home: '<path d="M3 10.8 12 3.5l9 7.3V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3.2 1.9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-3.7 3.7-5.5 7.5-5.5s6.9 1.8 7.5 5.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.9.85-4.3 4.15 1.05 5.85L12 17l-5.25 2.75L7.8 13.9 3.5 9.75l5.9-.85z"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    pencil: '<path d="M4 20h4L20 8l-4-4L4 16z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m4.5 18 5-4 3.5 2.8 3-2.3 4 3.5"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 13h9.2l.9-13"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/>',
    download: '<path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19.5h14"/>',
    upload: '<path d="M12 20V10m0 0 4 4m-4-4-4 4M5 4.5h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    arrowUp: '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14m0 0 6-6m-6 6-6-6"/>',
  };

  const icon = (name) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  const $ = (sel) => document.querySelector(sel);

  const esc = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () =>
    (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  const clampInt = (value, min, max) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const hueOf = (text) => {
    let hash = 0;
    for (const ch of String(text || '?')) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return hash % 360;
  };

  const initials = (title) => {
    const clean = String(title || '?').trim();
    if (!clean) return '?';
    const parts = clean.split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase();
  };

  const dayKey = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  };

  const fmtDay = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yest = new Date(Date.now() - 864e5);
    if (dayKey(ts) === dayKey(today.getTime())) return 'Today';
    if (dayKey(ts) === dayKey(yest.getTime())) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  };

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const fmtDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const relTime = (ts) => {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    if (diff < 6e4) return 'Just now';
    if (diff < 36e5) return Math.round(diff / 6e4) + 'm ago';
    if (diff < 864e5) return Math.round(diff / 36e5) + 'h ago';
    if (diff < 6048e5) return Math.round(diff / 864e5) + 'd ago';
    return fmtDate(ts);
  };

  /* ------------------------------------------------------------------ *
   * Artwork store (IndexedDB, with in-memory fallback)
   * ------------------------------------------------------------------ */

  const Art = (() => {
    const DB_NAME = 'gamevault-art';
    const STORE = 'art';
    let dbPromise = null;
    const memory = new Map();

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('unavailable'));
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('open failed'));
      });
      return dbPromise;
    }

    function run(mode, fn) {
      return open().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = fn(store);
        tx.oncomplete = () => resolve(request && 'result' in request ? request.result : undefined);
        tx.onerror = () => reject(tx.error || new Error('tx failed'));
        tx.onabort = () => reject(tx.error || new Error('tx aborted'));
      }));
    }

    return {
      async put(dataUrl) {
        const key = 'art_' + uid();
        memory.set(key, dataUrl);
        try { await run('readwrite', (s) => s.put(dataUrl, key)); } catch (e) { /* memory fallback */ }
        return key;
      },
      async get(key) {
        if (!key) return null;
        if (memory.has(key)) return memory.get(key);
        try {
          const value = await run('readonly', (s) => s.get(key));
          if (value) memory.set(key, value);
          return value || null;
        } catch (e) {
          return null;
        }
      },
      async all() {
        try {
          const keys = await run('readonly', (s) => s.getAllKeys());
          const values = await run('readonly', (s) => s.getAll());
          keys.forEach((k, i) => memory.set(k, values[i]));
        } catch (e) { /* ignore */ }
        return Object.fromEntries(memory);
      },
      async remove(key) {
        if (!key) return;
        memory.delete(key);
        try { await run('readwrite', (s) => s.delete(key)); } catch (e) { /* ignore */ }
      },
      async clear() {
        memory.clear();
        try { await run('readwrite', (s) => s.clear()); } catch (e) { /* ignore */ }
      },
    };
  })();

  /* ------------------------------------------------------------------ *
   * Data
   * ------------------------------------------------------------------ */

  const DEFAULT_SETTINGS = {
    accent: 'violet',
    view: 'grid',
    sort: 'added',
    autoArtwork: true,
    catalogueKey: '',
    trackActivity: true,
    haptics: true,
    reduceMotion: false,
  };

  const DEFAULT_PROFILE = {
    username: 'Player One',
    bio: '',
    avatarKey: null,
    favoriteGameIds: [],
    favoritePlatforms: [],
  };

  const emptyDb = () => ({
    schema: SCHEMA,
    games: [],
    collections: [],
    activity: [],
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
  });

  const ART = {}; // key -> data URL, hydrated at boot

  function loadDb() {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      parsed = null;
    }
    if (!parsed || typeof parsed !== 'object') return migrateLegacy();
    const base = emptyDb();
    return {
      schema: SCHEMA,
      games: Array.isArray(parsed.games) ? parsed.games.map(normalizeGame).filter(Boolean) : [],
      collections: Array.isArray(parsed.collections) ? parsed.collections.map(normalizeCollection) : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity.slice(0, 800) : [],
      profile: { ...base.profile, ...(parsed.profile || {}) },
      settings: { ...base.settings, ...(parsed.settings || {}) },
    };
  }

  function migrateLegacy() {
    const db = emptyDb();
    let legacy = [];
    try {
      legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    } catch (e) {
      legacy = [];
    }
    if (Array.isArray(legacy) && legacy.length) {
      db.games = legacy.map((g) => normalizeGame({
        id: g.id,
        title: g.title,
        genres: g.genre ? [g.genre] : [],
        platforms: g.platform ? [{ name: mapPlatform(g.platform), appId: null }] : [],
        status: g.status === 'completed' ? 'completed' : (g.status || 'backlog'),
        rating: g.rating || 0,
        notes: g.notes || '',
        addedAt: g.addedAt || Date.now(),
        launchCount: 0,
        lastPlayedAt: null,
        favorite: false,
      })).filter(Boolean);
      db.activity = db.games.map((g) => event('added', g.title, g.id, g.addedAt));
    }
    return db;
  }

  function mapPlatform(name) {
    const value = String(name || '').toLowerCase();
    if (value === 'pc' || value === 'windows') return 'Windows PC';
    if (value === 'nintendo switch' || value === 'nintendo') return 'Nintendo';
    if (value === 'playstation') return 'PlayStation';
    if (value === 'mobile') return 'Android';
    if (value === 'xbox') return 'Xbox';
    if (value === 'steam') return 'Steam';
    return PLATFORMS.find((p) => p.toLowerCase() === value) || 'Other';
  }

  function normalizeGame(raw) {
    if (!raw || !raw.title) return null;
    const platforms = Array.isArray(raw.platforms) && raw.platforms.length
      ? raw.platforms.map((p) => (typeof p === 'string' ? { name: mapPlatform(p), appId: null } : { name: mapPlatform(p.name), appId: p.appId || null }))
      : [];
    return {
      id: raw.id || uid(),
      title: String(raw.title).trim().slice(0, 120),
      franchise: String(raw.franchise || ''),
      description: String(raw.description || '').slice(0, 4000),
      developer: String(raw.developer || ''),
      publisher: String(raw.publisher || ''),
      releaseDate: raw.releaseDate || '',
      genres: Array.isArray(raw.genres) ? raw.genres.filter(Boolean).map(String).slice(0, 8) : [],
      platforms,
      status: STATUS_LABEL[raw.status] ? raw.status : 'backlog',
      favorite: !!raw.favorite,
      wishlist: !!raw.wishlist,
      rating: clampInt(raw.rating || 0, 0, 5),
      notes: String(raw.notes || '').slice(0, 2000),
      addedAt: Number(raw.addedAt) || Date.now(),
      lastPlayedAt: Number(raw.lastPlayedAt) || null,
      launchCount: Math.max(0, parseInt(raw.launchCount, 10) || 0),
      coverKey: raw.coverKey || null,
      backgroundKey: raw.backgroundKey || null,
      coverUrl: raw.coverUrl || null,
      backgroundUrl: raw.backgroundUrl || null,
      customArt: !!raw.customArt,
      source: raw.source || 'manual',
    };
  }

  function normalizeCollection(raw) {
    return {
      id: raw.id || uid(),
      name: String(raw.name || 'Collection').slice(0, 60),
      gameIds: Array.isArray(raw.gameIds) ? raw.gameIds.slice() : [],
      favorite: !!raw.favorite,
      artworkKey: raw.artworkKey || null,
      createdAt: Number(raw.createdAt) || Date.now(),
    };
  }

  let db = loadDb();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      toast('Storage is full. Export a backup and remove some artwork.', true);
      return false;
    }
  }

  function event(type, title, gameId, at, extra) {
    return { id: uid(), type, title, gameId: gameId || null, at: at || Date.now(), extra: extra || '' };
  }

  function logEvent(type, title, gameId, extra) {
    if (!db.settings.trackActivity) return;
    db.activity.unshift(event(type, title, gameId, Date.now(), extra));
    if (db.activity.length > 800) db.activity.length = 800;
  }

  function gameById(id) {
    return db.games.find((g) => g.id === id) || null;
  }

  function collectionById(id) {
    return db.collections.find((c) => c.id === id) || null;
  }

  const AUTO_COLLECTIONS = [
    { id: 'auto-all', name: 'All Games', match: () => true },
    { id: 'auto-favorites', name: 'Favorites', match: (g) => g.favorite },
    { id: 'auto-recent', name: 'Recently Added', match: (g) => Date.now() - g.addedAt < 14 * 864e5 },
    { id: 'auto-backlog', name: 'Backlog', match: (g) => g.status === 'backlog' },
    { id: 'auto-playing', name: 'Playing', match: (g) => g.status === 'playing' },
    { id: 'auto-completed', name: 'Completed', match: (g) => g.status === 'completed' },
  ];

  function collectionGames(id) {
    if (id.startsWith('auto-')) {
      const auto = AUTO_COLLECTIONS.find((a) => a.id === id);
      return auto ? db.games.filter(auto.match) : [];
    }
    const collection = collectionById(id);
    if (!collection) return [];
    return collection.gameIds.map(gameById).filter(Boolean);
  }

  function collectionName(id) {
    if (id.startsWith('auto-')) {
      const auto = AUTO_COLLECTIONS.find((a) => a.id === id);
      return auto ? auto.name : 'Collection';
    }
    const collection = collectionById(id);
    return collection ? collection.name : 'Collection';
  }

  /* ------------------------------------------------------------------ *
   * Android bridge
   * ------------------------------------------------------------------ */

  const host = window.AndroidHost || null;
  const installedCache = new Set();

  function installedApp(pkg) {
    if (!pkg) return false;
    if (installedCache.has(pkg)) return true;
    if (!host) return false;
    try {
      return !!host.isInstalled(pkg);
    } catch (e) {
      return false;
    }
  }

  function gamePlatformsInstalled(game) {
    return (game.platforms || []).some((p) => p.appId && installedApp(p.appId));
  }

  function haptic(ms) {
    if (!db.settings.haptics) return;
    try {
      if (navigator.vibrate) navigator.vibrate(ms || 12);
      else if (host && host.vibrate) host.vibrate(ms || 12);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ *
   * State + routing
   * ------------------------------------------------------------------ */

  const state = {
    stack: [{ screen: 'home', params: {} }],
    activeTab: 'home',
    query: '',
    sort: db.settings.sort,
    view: db.settings.view,
    filter: { platform: 'all', genre: 'all', status: 'all', favorites: false, installed: 'all', completion: 'all' },
    addTab: 'discover',
    discovery: null,
    discoveryBusy: false,
    discoveryQuery: '',
    selected: new Set(),
    catalogue: null,
    catalogueBusy: false,
    catalogueError: '',
    catalogueQuery: '',
    reorder: false,
    modalOpen: false,
    pendingArt: null,
    formPlatforms: [],
  };

  const TAB_OF = {
    home: 'home',
    library: 'library',
    add: 'add',
    activity: 'activity',
    profile: 'profile',
  };

  function go(screen, params) {
    state.stack.push({ screen, params: params || {} });
    state.activeTab = TAB_OF[screen] || state.activeTab;
    render();
    window.scrollTo(0, 0);
  }

  function tabTo(name) {
    if (state.activeTab === name && state.stack.length === 1) {
      closeModal();
      window.scrollTo(0, 0);
      return;
    }
    state.stack = [{ screen: name, params: {} }];
    state.activeTab = name;
    closeModal();
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    if (state.modalOpen) { closeModal(); return; }
    if (state.stack.length > 1) {
      state.stack.pop();
      state.activeTab = TAB_OF[state.stack[state.stack.length - 1].screen] || state.activeTab;
      render();
    }
  }

  // Called by the Android activity for the hardware/gesture back button.
  window.__gvBack = () => {
    if (state.modalOpen) { closeModal(); return true; }
    if (state.stack.length > 1) { back(); return true; }
    return false;
  };

  /* ------------------------------------------------------------------ *
   * Visual parts
   * ------------------------------------------------------------------ */

  function artUrl(record, kind) {
    const key = kind === 'background' ? record.backgroundKey : record.coverKey;
    if (key && ART[key]) return ART[key];
    const remote = kind === 'background' ? record.backgroundUrl : record.coverUrl;
    return remote || '';
  }

  function coverHtml(record, extraClass) {
    const url = artUrl(record, 'cover');
    return '<div class="cover ' + (extraClass || '') + '" style="--hue:' + hueOf(record.title) + '">' +
      (url ? '<img src="' + esc(url) + '" alt="" loading="lazy">' : '<span>' + esc(initials(record.title)) + '</span>') +
      '</div>';
  }

  function statusBadge(status) {
    return '<span class="badge ' + esc(status) + '">' + esc(STATUS_LABEL[status] || status) + '</span>';
  }

  function starsHtml(rating, interactive, gameId) {
    if (interactive) {
      let out = '<div class="star-picker" role="group" aria-label="Personal rating">';
      for (let i = 1; i <= 5; i++) {
        out += '<button type="button" class="' + (i <= rating ? 'on' : '') + '" data-act="rate" data-id="' +
          esc(gameId) + '" data-value="' + i + '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '">★</button>';
      }
      return out + '</div>';
    }
    if (!rating) return '<span class="muted">Unrated</span>';
    return '<span class="stars" aria-label="' + rating + ' of 5 stars">' + '★'.repeat(rating) +
      '<span class="off">' + '★'.repeat(5 - rating) + '</span></span>';
  }

  function gameCard(game, mode) {
    const meta = [platformNames(game), game.genres && game.genres[0]].filter(Boolean).join(' · ');
    return '<button type="button" class="card" data-act="open-game" data-id="' + esc(game.id) + '">' +
      coverHtml(game) +
      '<div class="title">' + esc(game.title) + '</div>' +
      '<div class="meta">' + esc(meta || STATUS_LABEL[game.status]) + '</div>' +
      '</button>';
  }

  function platformNames(game) {
    const names = (game.platforms || []).map((p) => p.name);
    return [...new Set(names)].slice(0, 2).join(', ');
  }

  function gameRow(game, trailing) {
    return '<button type="button" class="row-item" data-act="open-game" data-id="' + esc(game.id) + '">' +
      coverHtml(game) +
      '<div class="info"><div class="title">' + esc(game.title) + '</div>' +
      '<div class="meta">' + esc(platformNames(game) || 'No platform') + '</div></div>' +
      (trailing != null ? '<span class="value">' + esc(trailing) + '</span>' : statusBadge(game.status)) +
      '</button>';
  }

  function emptyState(title, body, actionLabel, action) {
    return '<div class="empty"><strong>' + esc(title) + '</strong>' + esc(body) +
      (action ? '<div style="margin-top:14px"><button type="button" class="btn primary" data-act="' + esc(action) + '">' +
        esc(actionLabel) + '</button></div>' : '') + '</div>';
  }

  /* ------------------------------------------------------------------ *
   * Screens
   * ------------------------------------------------------------------ */

  function screenHome() {
    const games = db.games;
    const played = games.filter((g) => g.launchCount > 0).length;
    const completed = games.filter((g) => g.status === 'completed').length;
    const launches = games.reduce((n, g) => n + (g.launchCount || 0), 0);
    const featured = games.slice().sort((a, b) =>
      (b.favorite - a.favorite) ||
      ((b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)) ||
      ((b.launchCount || 0) - (a.launchCount || 0)))[0];

    const continuePlaying = games.filter((g) => g.status === 'playing')
      .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)).slice(0, 8);
    const recent = games.slice().sort((a, b) => b.addedAt - a.addedAt).slice(0, 8);
    const mostPlayed = games.filter((g) => g.launchCount > 0)
      .sort((a, b) => b.launchCount - a.launchCount).slice(0, 3);
    const favCollections = db.collections.filter((c) => c.favorite).slice(0, 6);
    const favoriteGames = games.filter((g) => g.favorite).slice(0, 8);

    const userName = db.profile.username || 'Player One';

    let html = '<div class="screen"><div class="hello">' +
      '<div class="eyebrow">GameVault</div>' +
      '<h1>Welcome back,<br>' + esc(userName) + '</h1>' +
      '<div class="stats-row">' +
      statTile('Total', games.length) +
      statTile('Played', played) +
      statTile('Completed', completed) +
      statTile('Launches', launches) +
      '</div></div><div class="content">';

    if (!games.length) {
      html += '<div class="section">' + emptyState(
        'Your vault is empty',
        'Add a game from your device, search the online catalogue, or create one manually.',
        'Add your first game', 'tab-add') + '</div>' +
        '<div class="section"><div class="quick">' +
        '<button type="button" class="quick-tile accent" data-act="tab-add">' + icon('plus') + 'Add games</button>' +
        '<button type="button" class="quick-tile" data-act="open-collections">' + icon('folder') + 'Collections</button>' +
        '</div></div></div></div>';
      return html;
    }

    if (featured) {
      const bg = artUrl(featured, 'background') || artUrl(featured, 'cover');
      html += '<div class="section"><button type="button" class="hero" data-act="open-game" data-id="' + esc(featured.id) + '">' +
        (bg ? '<div class="hero-art" style="background-image:url(&quot;' + esc(bg) + '&quot;)"></div>' : '') +
        '<div class="hero-shade"></div><div class="hero-body">' +
        '<div class="hero-kicker">Featured game</div>' +
        '<div class="hero-title">' + esc(featured.title) + '</div>' +
        '<div class="hero-meta">' + esc([platformNames(featured), STATUS_LABEL[featured.status]].filter(Boolean).join(' · ')) + '</div>' +
        '<span class="hero-cta">Open details →</span>' +
        '</div></button></div>';
    }

    if (continuePlaying.length) {
      html += sectionHead('Continue playing', 'library', 'View library') +
        '<div class="rail">' + continuePlaying.map((g) =>
          '<button type="button" class="mini" data-act="open-game" data-id="' + esc(g.id) + '">' +
          coverHtml(g) + '<div class="mini-title">' + esc(g.title) + '</div>' +
          '<div class="mini-sub">' + esc(relTime(g.lastPlayedAt)) + '</div></button>').join('') + '</div></div>';
    }

    if (recent.length) {
      html += sectionHead('Recently added', 'library', 'See all') +
        '<div class="rail">' + recent.map((g) =>
          '<button type="button" class="mini" data-act="open-game" data-id="' + esc(g.id) + '">' +
          coverHtml(g) + '<div class="mini-title">' + esc(g.title) + '</div>' +
          '<div class="mini-sub">' + esc(relTime(g.addedAt)) + '</div></button>').join('') + '</div></div>';
    }

    if (mostPlayed.length) {
      html += '<div class="section">' + head('Most played') +
        '<div class="rows">' + mostPlayed.map((g) =>
          gameRow(g, (g.launchCount === 1 ? '1 launch' : g.launchCount + ' launches'))).join('') + '</div></div>';
    }

    if (favoriteGames.length) {
      html += sectionHead('Favorite games', 'library', 'See all') +
        '<div class="rail">' + favoriteGames.map((g) =>
          '<button type="button" class="mini" data-act="open-game" data-id="' + esc(g.id) + '">' +
          coverHtml(g) + '<div class="mini-title">' + esc(g.title) + '</div></button>').join('') + '</div></div>';
    }

    if (favCollections.length) {
      html += '<div class="section">' + head('Favorite collections') + '<div class="quick">' +
        favCollections.map((c) =>
          '<button type="button" class="quick-tile" data-act="open-collection" data-id="' + esc(c.id) + '">' +
          icon('folder') + esc(c.name) + '<span class="mini-sub">' + c.gameIds.length + ' games</span></button>').join('') +
        '</div></div>';
    }

    html += '<div class="section">' + head('Quick access') + '<div class="quick">' +
      '<button type="button" class="quick-tile accent" data-act="tab-library">' + icon('grid') + 'Full library</button>' +
      '<button type="button" class="quick-tile" data-act="open-collections">' + icon('folder') + 'Collections</button>' +
      '<button type="button" class="quick-tile" data-act="tab-activity">' + icon('clock') + 'Activity</button>' +
      '<button type="button" class="quick-tile" data-act="tab-profile">' + icon('user') + 'Profile</button>' +
      '</div></div>';

    return html + '</div></div>';
  }

  function statTile(label, value) {
    return '<div class="stat"><span class="stat-value">' + esc(value) + '</span>' +
      '<span class="stat-label">' + esc(label) + '</span></div>';
  }

  function head(title) {
    return '<div class="section-head"><h2>' + esc(title) + '</h2></div>';
  }

  function sectionHead(title, tab, linkLabel) {
    return '<div class="section"><div class="section-head"><h2>' + esc(title) + '</h2>' +
      '<button type="button" class="link" data-act="tab-' + esc(tab) + '">' + esc(linkLabel) + '</button></div>';
  }

  function screenLibrary() {
    const items = visibleGames();
    const rootGames = db.games.length;
    return '<div class="screen">' +
      '<div class="screen-head"><div><h1>Library</h1>' +
      '<div class="sub">' + rootGames + ' game' + (rootGames === 1 ? '' : 's') + ' in your vault</div></div>' +
      '<span class="head-spacer"></span>' +
      '<button type="button" class="icon-btn solid" data-act="tab-add" aria-label="Add game">' + icon('plus') + '</button></div>' +
      '<div class="content"><div class="toolbar">' +
      '<label class="search-field">' + icon('search') +
      '<input id="lib-search" type="search" placeholder="Search titles, franchises, genres" ' +
      'value="' + esc(state.query) + '" aria-label="Search library"></label>' +
      '<button type="button" class="icon-btn" data-act="open-filters" aria-label="Filters">' + icon('filter') + '</button>' +
      '</div>' +
      '<div class="chips" style="margin-top:10px">' + statusFilterChips() + '</div>' +
      '<div class="count-line"><span id="lib-count">' + resultLabel(items.length) + '</span>' +
      '<span style="display:flex;gap:8px;align-items:center">' +
      '<span class="seg" role="group" aria-label="Display mode">' + VIEWS.map(([id, label]) =>
        '<button type="button" data-act="set-view" data-view="' + id + '" aria-pressed="' + (state.view === id) + '">' + label + '</button>').join('') +
      '</span>' +
      '<select id="lib-sort" aria-label="Sort games" style="width:auto;padding:8px 10px;font-size:12px">' +
      SORTS.map(([id, label]) =>
        '<option value="' + id + '"' + (state.sort === id ? ' selected' : '') + '>' + label + '</option>').join('') +
      '</select></span></div>' +
      '<div id="lib-body">' + libraryBody(items) + '</div>' +
      '</div></div>';
  }

  function resultLabel(count) {
    return count + ' game' + (count === 1 ? '' : 's');
  }

  function statusFilterChips() {
    const all = [['all', 'All']].concat(STATUSES);
    return all.map(([id, label]) =>
      '<button type="button" class="chip" data-act="filter-status" data-status="' + id + '" ' +
      'aria-pressed="' + (state.filter.status === id) + '">' + esc(label) + '</button>').join('');
  }

  function libraryBody(items) {
    if (!db.games.length) {
      return emptyState('Nothing here yet', 'Add games from your device or manually to start your collection.', 'Add a game', 'tab-add');
    }
    if (!items.length) {
      return emptyState('No matches', 'No games match the current search and filters.', 'Clear filters', 'clear-filters');
    }
    if (state.view === 'list') {
      return '<div class="rows">' + items.map((g) => gameRow(g)).join('') + '</div>';
    }
    return '<div class="grid' + (state.view === 'compact' ? ' compact' : '') + '">' +
      items.map((g) => gameCard(g)).join('') + '</div>';
  }

  function sorterFor(key) {
    const byTitle = (a, b) => a.title.localeCompare(b.title);
    switch (key) {
      case 'title': return byTitle;
      case 'played': return (a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0) || byTitle(a, b);
      case 'launches': return (a, b) => (b.launchCount || 0) - (a.launchCount || 0) || byTitle(a, b);
      case 'released': return (a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '') || byTitle(a, b);
      default: return (a, b) => b.addedAt - a.addedAt || byTitle(a, b);
    }
  }

  function visibleGames() {
    const q = state.query.trim().toLowerCase();
    const f = state.filter;
    return db.games.filter((g) => {
      if (f.platform !== 'all' && !(g.platforms || []).some((p) => p.name === f.platform)) return false;
      if (f.genre !== 'all' && !(g.genres || []).includes(f.genre)) return false;
      if (f.status !== 'all' && g.status !== f.status) return false;
      if (f.favorites && !g.favorite) return false;
      if (f.completion === 'completed' && g.status !== 'completed') return false;
      if (f.completion === 'incomplete' && g.status === 'completed') return false;
      if (f.installed === 'yes' && !gamePlatformsInstalled(g)) return false;
      if (f.installed === 'no' && gamePlatformsInstalled(g)) return false;
      if (q) {
        const hay = [g.title, g.franchise, g.developer, g.publisher,
          ...(g.genres || []), ...(g.platforms || []).map((p) => p.name)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort(sorterFor(state.sort));
  }

  function screenAdd() {
    const tabs = [['discover', 'Device'], ['catalogue', 'Catalogue'], ['manual', 'Manual']];
    let body = '';

    if (state.addTab === 'discover') body = discoverBody();
    else if (state.addTab === 'catalogue') body = catalogueBody();
    else body = manualBody();

    return '<div class="screen">' +
      '<div class="screen-head"><div><h1>Add games</h1>' +
      '<div class="sub">Device discovery · online catalogue · manual entry</div></div></div>' +
      '<div class="content">' +
      '<div class="seg seg-wide" style="margin-bottom:16px">' + tabs.map(([id, label]) =>
        '<button type="button" data-act="add-tab" data-tab="' + id + '" aria-pressed="' + (state.addTab === id) + '">' +
        esc(label) + '</button>').join('') + '</div>' + body + '</div></div>';
  }

  function discoverBody() {
    if (!host) {
      return '<div class="notice"><span>' + icon('image') + '</span><div><strong>Device discovery runs in the Android app.</strong><br>' +
        'Installed games can be detected when GameVault runs on a device. You can still add games manually.</div></div>';
    }
    let html = '<div class="notice" style="margin-bottom:14px"><span>' + icon('check') + '</span><div>' +
      '<strong>Scan your device</strong><br>Lists launchable apps so you can add them to your vault. Detection can be corrected by editing any game afterwards.</div></div>';
    html += '<div class="toolbar" style="margin-bottom:12px">' +
      '<button type="button" class="btn primary" data-act="discover-scan">' + icon('search') +
      (state.discovery ? 'Rescan device' : 'Scan device') + '</button>' +
      (state.selected.size ? '<button type="button" class="btn" data-act="discover-add">Add ' + state.selected.size + '</button>' : '') +
      '</div>';
    if (state.discoveryBusy) {
      return html + '<div class="rows">' + Array.from({ length: 6 }).map(() =>
        '<div class="skeleton" style="height:68px"></div>').join('') + '</div>';
    }
    if (!state.discovery) return html;

    const q = state.discoveryQuery.trim().toLowerCase();
    const apps = state.discovery.filter((a) => !q || a.label.toLowerCase().includes(q));
    if (!apps.length) return html + emptyState('No apps found', 'Try a different search term.', '');

    return html + '<label class="search-field" style="margin-bottom:12px">' + icon('search') +
      '<input id="disc-search" type="search" placeholder="Search installed apps" value="' + esc(state.discoveryQuery) + '"></label>' +
      '<div class="rows">' + apps.map((app) => {
        const existing = gameForPackage(app.packageName);
        const selected = state.selected.has(app.packageName);
        return '<button type="button" class="discover-row' + (existing ? ' in-library' : '') + '" ' +
          'data-act="discover-toggle" data-pkg="' + esc(app.packageName) + '" aria-pressed="' + (selected || !!existing) + '"' +
          (existing ? ' disabled' : '') + '>' +
          '<img class="app-icon" src="' + esc(app.icon || '') + '" alt="" loading="lazy">' +
          '<div class="info" style="flex:1;min-width:0"><div class="title">' + esc(app.label) + '</div>' +
          '<div class="meta">' + esc(existing ? 'Already in library' : app.packageName) + '</div></div>' +
          '<span class="check">' + icon('check') + '</span></button>';
      }).join('') + '</div>';
  }

  function gameForPackage(pkg) {
    return db.games.find((g) => (g.platforms || []).some((p) => p.appId === pkg)) || null;
  }

  function catalogueBody() {
    const key = (db.settings.catalogueKey || '').trim();
    let html = '<div class="notice" style="margin-bottom:14px"><span>' + icon('search') + '</span><div>' +
      '<strong>Online catalogue</strong><br>Search a public games database and import title, cover, description, release date, genres and companies. ' +
      'A free RAWG API key is required.</div></div>';

    if (!key) {
      html += '<form id="form-catalogue-key" class="panel" style="margin-bottom:14px">' +
        '<div class="panel-title">Catalogue access</div>' +
        '<label class="field"><span>RAWG API key</span>' +
        '<input name="key" placeholder="Paste your api.rawg.io key" autocomplete="off"></label>' +
        '<button class="btn block" type="submit">Save key</button>' +
        '<p class="desc" style="margin:10px 0 0">Get a key at rawg.io/apidocs. It is stored only on this device and used only for catalogue requests. ' +
        'Without a key, manual entry and your existing library keep working offline.</p></form>';
    } else {
      html += '<form id="form-catalogue" class="toolbar" style="margin-bottom:14px">' +
        '<label class="search-field">' + icon('search') +
        '<input name="q" type="search" placeholder="Search the catalogue" value="' + esc(state.catalogueQuery) + '"></label>' +
        '<button class="icon-btn solid" type="submit" aria-label="Search catalogue">' + icon('search') + '</button></form>';
    }

    if (state.catalogueBusy) {
      return html + '<div class="rows">' + Array.from({ length: 5 }).map(() =>
        '<div class="skeleton" style="height:76px"></div>').join('') + '</div>';
    }
    if (state.catalogueError) {
      return html + '<div class="notice" style="border-color:rgba(251,95,108,.5)"><div><strong>Catalogue unavailable</strong><br>' +
        esc(state.catalogueError) + ' Check your connection or add the game manually.</div></div>' +
        '<button type="button" class="btn block" style="margin-top:12px" data-act="add-tab" data-tab="manual">Add manually instead</button>';
    }
    if (!state.catalogue) {
      return html + '<div class="empty"><strong>Search the catalogue</strong>Results appear here with artwork and metadata you can import.</div>';
    }
    if (!state.catalogue.length) {
      return html + emptyState('No results', 'Nothing matched that search. Try another title.', 'Create manually', 'add-tab');
    }

    return html + '<div class="rows">' + state.catalogue.map((item, index) => {
      const existing = db.games.find((g) => g.title.toLowerCase() === item.title.toLowerCase());
      return '<div class="row-item" style="cursor:default">' +
        '<div class="cover" style="width:56px;height:56px;border-radius:12px;font-size:15px;--hue:' + hueOf(item.title) + '">' +
        (item.image ? '<img src="' + esc(item.image) + '" alt="" loading="lazy">' : '<span>' + esc(initials(item.title)) + '</span>') + '</div>' +
        '<div class="info" style="flex:1;min-width:0"><div class="title">' + esc(item.title) + '</div>' +
        '<div class="meta">' + esc([item.released ? item.released.slice(0, 4) : '', (item.platforms || []).slice(0, 2).join(', ')].filter(Boolean).join(' · ')) + '</div></div>' +
        '<button type="button" class="btn" style="min-height:38px;padding:8px 14px" data-act="catalogue-add" data-index="' + index + '">' +
        (existing ? 'Merge' : 'Add') + '</button></div>';
    }).join('') + '</div>';
  }

  function manualBody() {
    return '<form id="form-game" class="panel">' +
      '<input type="hidden" name="id" value="">' +
      '<div class="sheet-head"><h2 style="font-size:17px">Manual entry</h2></div>' +
      gameFormFields({ title: '', franchise: '', genres: [], platforms: [], status: 'backlog', rating: 0, notes: '', description: '', developer: '', publisher: '', releaseDate: '' }) +
      '<div class="form-actions"><span class="spacer"></span>' +
      '<button type="submit" class="btn primary">Add to library</button></div></form>';
  }

  function gameFormFields(values, options) {
    const opts = options || {};
    state.formPlatforms = (values.platforms || []).map((p) => (typeof p === 'string' ? p : p.name));
    const genreText = Array.isArray(values.genres) ? values.genres.join(', ') : '';
    return '<label class="field"><span>Title *</span><input name="title" required maxlength="120" value="' + esc(values.title) + '" placeholder="Game title"></label>' +
      '<label class="field"><span>Franchise</span><input name="franchise" maxlength="60" value="' + esc(values.franchise) + '" placeholder="e.g. Resident Evil"></label>' +
      '<label class="field"><span>Platforms</span><div class="chips" style="flex-wrap:wrap">' +
      PLATFORMS.map((p) => '<button type="button" class="chip small" data-act="form-platform" data-platform="' + esc(p) + '" ' +
        'aria-pressed="' + state.formPlatforms.includes(p) + '">' + esc(p) + '</button>').join('') + '</div></label>' +
      '<div class="field-row">' +
      '<label class="field"><span>Status</span><select name="status">' + STATUSES.map(([id, label]) =>
        '<option value="' + id + '"' + (values.status === id ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Rating</span><select name="rating">' + [0, 1, 2, 3, 4, 5].map((n) =>
        '<option value="' + n + '"' + (values.rating === n ? ' selected' : '') + '>' + (n ? n + ' / 5' : 'Unrated') + '</option>').join('') +
        '</select></label></div>' +
      '<label class="field"><span>Genres</span><input name="genres" maxlength="120" value="' + esc(genreText) + '" placeholder="Action, RPG"></label>' +
      '<div class="field-row">' +
      '<label class="field"><span>Developer</span><input name="developer" maxlength="80" value="' + esc(values.developer) + '"></label>' +
      '<label class="field"><span>Publisher</span><input name="publisher" maxlength="80" value="' + esc(values.publisher) + '"></label></div>' +
      '<div class="field-row">' +
      '<label class="field"><span>Release date</span><input name="releaseDate" type="date" value="' + esc(values.releaseDate) + '"></label>' +
      '<label class="field"><span>Cover</span><button type="button" class="btn" data-act="change-art" data-target="cover">' +
      (opts.coverLabel || 'Choose image') + '</button></label></div>' +
      '<label class="field"><span>Description</span><textarea name="description" maxlength="2000" rows="3">' + esc(values.description) + '</textarea></label>' +
      '<label class="field"><span>Personal notes</span><textarea name="notes" maxlength="2000" rows="3">' + esc(values.notes) + '</textarea></label>';
  }

  function screenGame(params) {
    const game = gameById(params.id);
    if (!game) return '<div class="screen"><div class="content" style="padding-top:40px">' +
      emptyState('Game not found', 'This entry no longer exists.', 'Back to library', 'tab-library') + '</div></div>';

    const cover = artUrl(game, 'cover');
    const bg = artUrl(game, 'background') || cover;
    const launchable = (game.platforms || []).find((p) => p.appId && installedApp(p.appId));

    return '<div class="screen">' +
      '<div class="detail-hero">' +
      '<div class="top-actions"><button type="button" class="icon-btn" data-act="back" aria-label="Back">' + icon('back') + '</button>' +
      '<button type="button" class="icon-btn" data-act="edit-game" data-id="' + esc(game.id) + '" aria-label="Edit game">' + icon('pencil') + '</button></div>' +
      (bg ? '<div class="hero-art" style="background-image:url(&quot;' + esc(bg) + '&quot;)"></div>' : '') +
      '<div class="hero-shade"></div>' +
      '<div class="detail-head">' + coverHtml(game) +
      '<div class="titles"><h1>' + esc(game.title) + '</h1>' +
      '<div class="meta">' + esc([game.franchise, platformNames(game)].filter(Boolean).join(' · ') || 'No platform') + '</div>' +
      '<div class="row" style="margin-top:8px;display:flex;gap:8px;align-items:center">' +
      statusBadge(game.status) + (game.favorite ? '<span class="badge">★ Favorite</span>' : '') +
      (game.wishlist ? '<span class="badge">Wishlist</span>' : '') + '</div></div></div></div>' +

      '<div class="content">' +
      '<div class="panel" style="margin-top:16px"><div class="panel-title">Status</div>' +
      '<div class="status-row">' + STATUSES.map(([id, label]) =>
        '<button type="button" class="chip' + (game.status === id ? '' : '') + '" data-act="set-status" data-id="' + esc(game.id) +
        '" data-status="' + id + '" aria-pressed="' + (game.status === id) + '">' + esc(label) + '</button>').join('') + '</div></div>' +

      '<div class="panel" style="margin-top:12px"><div class="panel-title">Personal</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
      '<span style="font-size:13.5px;color:var(--muted)">Your rating</span>' + starsHtml(game.rating, true, game.id) + '</div>' +
      '<dl class="kv"><dt>Added</dt><dd>' + esc(fmtDate(game.addedAt)) + '</dd>' +
      '<dt>Last played</dt><dd>' + esc(relTime(game.lastPlayedAt)) + '</dd>' +
      '<dt>Launch count</dt><dd>' + esc(game.launchCount) + '</dd></dl>' +
      '<div class="action-grid" style="margin-top:14px">' +
      '<button type="button" class="btn" data-act="toggle-fav" data-id="' + esc(game.id) + '" aria-pressed="' + game.favorite + '">' +
      '★ ' + (game.favorite ? 'Favorite' : 'Add favorite') + '</button>' +
      '<button type="button" class="btn" data-act="toggle-wish" data-id="' + esc(game.id) + '" aria-pressed="' + game.wishlist + '">' +
      (game.wishlist ? 'On wishlist' : 'Add to wishlist') + '</button>' +
      '<button type="button" class="btn" data-act="toggle-profile-fav" data-id="' + esc(game.id) + '">' + icon('star') +
      ((db.profile.favoriteGameIds || []).includes(game.id) ? 'Profile pick' : 'On profile') + '</button>' +
      (launchable ? '<button type="button" class="btn primary" data-act="launch" data-id="' + esc(game.id) + '">' + icon('play') + 'Launch</button>' : '') +
      '<button type="button" class="btn" data-act="add-to-collection" data-id="' + esc(game.id) + '">' + icon('folder') + 'Collection</button>' +
      '<button type="button" class="btn" data-act="change-art" data-target="cover" data-id="' + esc(game.id) + '">' + icon('image') + 'Cover</button>' +
      '<button type="button" class="btn" data-act="change-art" data-target="background" data-id="' + esc(game.id) + '">' + icon('image') + 'Backdrop</button>' +
      '</div></div>' +

      '<div class="panel" style="margin-top:12px"><div class="panel-title">Platform versions</div>' +
      '<div class="plat-list">' + (game.platforms || []).map((p, i) =>
        '<span class="chip small">' + esc(p.name) + (p.appId && installedApp(p.appId) ? ' · installed' : '') +
        ' <button type="button" data-act="remove-platform" data-id="' + esc(game.id) + '" data-index="' + i +
        '" aria-label="Remove ' + esc(p.name) + '" style="border:0;background:none;color:var(--muted);padding:0 0 0 4px">×</button></span>').join('') +
      '<button type="button" class="chip small" data-act="add-platform" data-id="' + esc(game.id) + '">+ Add version</button></div></div>' +

      gameInfoPanel(game) +
      (game.notes ? '<div class="panel" style="margin-top:12px"><div class="panel-title">Notes</div>' +
        '<p class="desc" style="white-space:pre-wrap;margin:0">' + esc(game.notes) + '</p></div>' : '') +

      '<div class="actions" style="margin-top:18px">' +
      '<button type="button" class="btn danger" data-act="delete-game" data-id="' + esc(game.id) + '">' + icon('trash') + 'Remove from library</button>' +
      '</div></div></div>';
  }

  function gameInfoPanel(game) {
    const rows = [
      ['Description', game.description],
      ['Developer', game.developer],
      ['Publisher', game.publisher],
      ['Release date', game.releaseDate ? fmtDate(game.releaseDate) : ''],
      ['Genres', (game.genres || []).join(', ')],
    ].filter(([, value]) => value);
    if (!rows.length) return '';
    return '<div class="panel" style="margin-top:12px"><div class="panel-title">About the game</div>' +
      (game.description ? '<p class="desc" style="margin:0 0 12px">' + esc(game.description) + '</p>' : '') +
      '<dl class="kv">' + rows.filter(([label]) => label !== 'Description').map(([label, value]) =>
        '<dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd>').join('') + '</dl></div>';
  }

  function screenCollections() {
    const userCollections = db.collections;
    return '<div class="screen">' +
      '<div class="screen-head"><button type="button" class="icon-btn" data-act="back" aria-label="Back">' + icon('back') + '</button>' +
      '<div><h1>Collections</h1><div class="sub">Group your games your way</div></div></div>' +
      '<div class="content">' +
      '<button type="button" class="btn primary block" data-act="new-collection">' + icon('plus') + 'New collection</button>' +
      '<div class="section">' + head('Smart collections') + '<div class="quick">' +
      AUTO_COLLECTIONS.map((auto) => {
        const count = db.games.filter(auto.match).length;
        return '<button type="button" class="quick-tile" data-act="open-collection" data-id="' + auto.id + '">' +
          icon('folder') + esc(auto.name) + '<span class="mini-sub">' + count + ' game' + (count === 1 ? '' : 's') + '</span></button>';
      }).join('') + '</div></div>' +
      '<div class="section">' + head('Your collections') +
      (userCollections.length
        ? '<div class="rows">' + userCollections.map((c) =>
          '<button type="button" class="row-item" data-act="open-collection" data-id="' + esc(c.id) + '">' +
          '<div class="cover" style="width:56px;height:56px;border-radius:12px;--hue:' + hueOf(c.name) + '">' +
          (c.artworkKey && ART[c.artworkKey] ? '<img src="' + esc(ART[c.artworkKey]) + '" alt="">' : '<span>' + esc(initials(c.name)) + '</span>') +
          '</div><div class="info"><div class="title">' + esc(c.name) + (c.favorite ? ' ★' : '') + '</div>' +
          '<div class="meta">' + c.gameIds.length + ' game' + (c.gameIds.length === 1 ? '' : 's') + '</div></div>' +
          '<span class="value">' + icon('arrowUp') + '</span></button>').join('') + '</div>'
        : emptyState('No collections yet', 'Create a collection to group games by franchise, mood or anything else.', '', '')) +
      '</div></div></div>';
  }

  function screenCollection(params) {
    const id = params.id;
    const isAuto = id.startsWith('auto-');
    const collection = isAuto ? null : collectionById(id);
    if (!isAuto && !collection) {
      return '<div class="screen"><div class="content" style="padding-top:40px">' +
        emptyState('Collection not found', 'It may have been deleted.', 'Collections', 'open-collections') + '</div></div>';
    }
    const games = collectionGames(id);
    const name = collectionName(id);

    return '<div class="screen">' +
      '<div class="screen-head"><button type="button" class="icon-btn" data-act="back" aria-label="Back">' + icon('back') + '</button>' +
      '<div><h1>' + esc(name) + '</h1><div class="sub">' + games.length + ' game' + (games.length === 1 ? '' : 's') + '</div></div></div>' +
      '<div class="content">' +
      (collection ? '<div class="action-grid" style="margin-bottom:14px">' +
        '<button type="button" class="btn" data-act="fav-collection" data-id="' + esc(id) + '">' +
        '★ ' + (collection.favorite ? 'Favorited' : 'Favorite') + '</button>' +
        '<button type="button" class="btn" data-act="rename-collection" data-id="' + esc(id) + '">' + icon('pencil') + 'Rename</button>' +
        '<button type="button" class="btn" data-act="collection-art" data-id="' + esc(id) + '">' + icon('image') + 'Artwork</button>' +
        '<button type="button" class="btn" data-act="collection-add" data-id="' + esc(id) + '">' + icon('plus') + 'Add games</button>' +
        '<button type="button" class="btn" data-act="reorder-toggle">' + icon('arrowUp') + (state.reorder ? 'Done' : 'Reorder') + '</button>' +
        '<button type="button" class="btn danger" data-act="delete-collection" data-id="' + esc(id) + '">' + icon('trash') + 'Delete</button>' +
        '</div>' : '') +
      (games.length
        ? (state.reorder && collection
          ? '<div class="rows">' + games.map((g, i) =>
            '<div class="row-item" style="cursor:default"><div class="info"><div class="title">' + esc(g.title) + '</div></div>' +
            '<button type="button" class="icon-btn" data-act="move-game" data-id="' + esc(id) + '" data-index="' + i + '" data-dir="-1" aria-label="Move up">' + icon('arrowUp') + '</button>' +
            '<button type="button" class="icon-btn" data-act="move-game" data-id="' + esc(id) + '" data-index="' + i + '" data-dir="1" aria-label="Move down">' + icon('arrowDown') + '</button>' +
            '<button type="button" class="icon-btn" data-act="collection-remove" data-id="' + esc(id) + '" data-game="' + esc(g.id) + '" aria-label="Remove">×</button></div>').join('') + '</div>'
          : '<div class="grid">' + games.map((g) => gameCard(g)).join('') + '</div>')
        : emptyState('No games here', 'Add games to this collection to see them together.', 'Browse library', 'tab-library')) +
      '</div></div>';
  }

  function screenActivity() {
    const groups = new Map();
    db.activity.forEach((e) => {
      const key = dayKey(e.at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });

    const launches = db.games.reduce((n, g) => n + g.launchCount, 0);
    const played = db.games.filter((g) => g.launchCount > 0).length;
    const completed = db.games.filter((g) => g.status === 'completed').length;
    const completion = db.games.length ? Math.round((completed / db.games.length) * 100) : 0;

    const platformCounts = {};
    db.games.forEach((g) => (g.platforms || []).forEach((p) => {
      platformCounts[p.name] = (platformCounts[p.name] || 0) + 1;
    }));
    const genreCounts = {};
    db.games.forEach((g) => (g.genres || []).forEach((name) => {
      genreCounts[name] = (genreCounts[name] || 0) + 1;
    }));

    const total = Math.max(1, ...Object.values(platformCounts), ...Object.values(genreCounts));
    const bars = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) =>
      '<div class="bar-row"><div class="bar-head"><span>' + esc(name) + '</span><span class="val">' + count + '</span></div>' +
      '<div class="bar"><span style="width:' + Math.round((count / total) * 100) + '%"></span></div></div>').join('');

    let timeline = '';
    if (!db.activity.length) {
      timeline = emptyState('No activity yet', 'Adding, launching and completing games will appear here.', 'Add a game', 'tab-add');
    } else {
      groups.forEach((events, key) => {
        timeline += '<div class="day-label">' + esc(fmtDay(events[0].at)) + '</div><div class="timeline">' +
          events.map((e) => {
            const meta = EVENT_TEXT[e.type] || { icon: '•', text: (title) => title };
            return '<div class="event"><div class="event-dot">' + esc(meta.icon) + '</div>' +
              '<div class="event-body"><div class="event-text">' + meta.text(e.title, e.extra) + '</div>' +
              '<div class="event-time">' + esc(fmtTime(e.at)) + '</div></div></div>';
          }).join('') + '</div>';
      });
    }

    return '<div class="screen">' +
      '<div class="screen-head"><div><h1>Activity</h1><div class="sub">Your gaming history and statistics</div></div></div>' +
      '<div class="content">' +
      '<div class="stats-row">' + statTile('Launches', launches) + statTile('Played', played) +
      statTile('Completed', completed) + statTile('Done', completion + '%') + '</div>' +
      '<div class="section">' + head('Top games by launches') +
      (db.games.some((g) => g.launchCount > 0)
        ? '<div class="rows">' + db.games.filter((g) => g.launchCount > 0).sort((a, b) => b.launchCount - a.launchCount)
          .slice(0, 5).map((g) => gameRow(g, g.launchCount + ' ×')).join('') + '</div>'
        : '<p class="desc">No launches recorded yet. Launch a supported Android game to start tracking.</p>') + '</div>' +
      (Object.keys(platformCounts).length ? '<div class="section">' + head('Platform distribution') +
        '<div class="panel">' + bars(platformCounts) + '</div></div>' : '') +
      (Object.keys(genreCounts).length ? '<div class="section">' + head('Genre distribution') +
        '<div class="panel">' + bars(genreCounts) + '</div></div>' : '') +
      '<div class="section">' + head('Timeline') + timeline + '</div>' +
      '</div></div>';
  }

  const EVENT_TEXT = {
    added: { icon: '＋', text: (t) => 'Added <b>' + esc(t) + '</b> to the library' },
    launched: { icon: '▶', text: (t) => 'Launched <b>' + esc(t) + '</b>' },
    completed: { icon: '✓', text: (t) => 'Completed <b>' + esc(t) + '</b>' },
    status: { icon: '◐', text: (t, extra) => 'Moved <b>' + esc(t) + '</b> to ' + esc(STATUS_LABEL[extra] || extra) },
    removed: { icon: '×', text: (t) => 'Removed <b>' + esc(t) + '</b> from the library' },
    artwork: { icon: '▣', text: (t) => 'Updated artwork for <b>' + esc(t) + '</b>' },
    collection: { icon: '▤', text: (t) => 'Added <b>' + esc(t) + '</b> to a collection' },
  };

  function screenProfile() {
    const profile = db.profile;
    const avatarUrl = profile.avatarKey && ART[profile.avatarKey];
    const favorites = (profile.favoriteGameIds || []).map(gameById).filter(Boolean);
    const stats = {
      total: db.games.length,
      completed: db.games.filter((g) => g.status === 'completed').length,
      launches: db.games.reduce((n, g) => n + g.launchCount, 0),
    };

    return '<div class="screen">' +
      '<div class="screen-head"><div><h1>Profile</h1><div class="sub">Local profile · no account needed</div></div>' +
      '<span class="head-spacer"></span>' +
      '<button type="button" class="icon-btn" data-act="open-settings" aria-label="Settings">⚙</button></div>' +
      '<div class="content">' +
      '<div class="profile-head">' +
      '<button type="button" class="avatar" data-act="change-avatar" aria-label="Change profile image">' +
      (avatarUrl ? '<img src="' + esc(avatarUrl) + '" alt="">' : esc(initials(profile.username || 'Player One'))) + '</button>' +
      '<div class="profile-name">' + esc(profile.username || 'Player One') + '</div>' +
      (profile.bio ? '<div class="profile-bio">' + esc(profile.bio) + '</div>' : '') +
      '<button type="button" class="btn" data-act="edit-profile">Edit profile</button>' +
      '</div>' +
      '<div class="stats-row" style="margin-top:18px">' + statTile('Games', stats.total) +
      statTile('Completed', stats.completed) + statTile('Launches', stats.launches) +
      statTile('Favorite', favorites.length) + '</div>' +
      '<div class="section">' + head('Favorite platforms') +
      (profile.favoritePlatforms && profile.favoritePlatforms.length
        ? '<div class="chips" style="flex-wrap:wrap">' + profile.favoritePlatforms.map((p) =>
          '<span class="chip small">' + esc(p) + '</span>').join('') + '</div>'
        : '<p class="desc">Pick the platforms you play most in Edit profile.</p>') + '</div>' +
      '<div class="section">' + head('Favorite games') +
      (favorites.length
        ? '<div class="rail">' + favorites.map((g) =>
          '<button type="button" class="mini" data-act="open-game" data-id="' + esc(g.id) + '">' +
          coverHtml(g) + '<div class="mini-title">' + esc(g.title) + '</div></button>').join('') + '</div>'
        : emptyState('No favorite games yet', 'Open a game and add it to your profile favorites.', 'Open library', 'tab-library')) + '</div>' +
      '<div class="section"><div class="list-card">' +
      '<button type="button" class="item" data-act="open-settings"><span class="grow">Settings<small class="hint">Appearance, library, artwork, backups</small></span><span class="value">›</span></button>' +
      '<button type="button" class="item" data-act="open-collections"><span class="grow">Collections<small class="hint">' + db.collections.length + ' custom collection' + (db.collections.length === 1 ? '' : 's') + '</small></span><span class="value">›</span></button>' +
      '<button type="button" class="item" data-act="tab-activity"><span class="grow">Activity<small class="hint">Timeline and statistics</small></span><span class="value">›</span></button>' +
      '</div></div>' +
      '</div></div>';
  }

  function screenSettings() {
    const s = db.settings;
    const artCount = Object.keys(ART).length;
    return '<div class="screen">' +
      '<div class="screen-head"><button type="button" class="icon-btn" data-act="back" aria-label="Back">' + icon('back') + '</button>' +
      '<div><h1>Settings</h1><div class="sub">Everything stays on this device</div></div></div>' +
      '<div class="content">' +

      '<div class="group"><div class="group-title">Appearance</div><div class="list-card">' +
      '<div class="item"><span class="grow">Accent colour<small class="hint">Violet and cyan form the GameVault identity</small></span></div>' +
      '<div class="item" style="gap:8px;flex-wrap:wrap">' + ACCENTS.map(([id, label]) =>
        '<button type="button" class="chip small" data-act="set-accent" data-accent="' + id + '" aria-pressed="' + (s.accent === id) + '">' +
        esc(label) + '</button>').join('') + '</div>' +
      toggleItem('Reduce motion', 'Disable transitions and parallax', 'toggle-motion', s.reduceMotion) +
      toggleItem('Haptic feedback', 'Vibrate on meaningful actions', 'toggle-haptics', s.haptics) +
      '</div></div>' +

      '<div class="group"><div class="group-title">Library</div><div class="list-card">' +
      '<div class="item"><span class="grow">Default view</span><select data-setting="view" style="width:auto">' +
      VIEWS.map(([id, label]) => '<option value="' + id + '"' + (s.view === id ? ' selected' : '') + '>' + label + '</option>').join('') +
      '</select></div>' +
      '<div class="item"><span class="grow">Default sorting</span><select data-setting="sort" style="width:auto">' +
      SORTS.map(([id, label]) => '<option value="' + id + '"' + (s.sort === id ? ' selected' : '') + '>' + label + '</option>').join('') +
      '</select></div></div></div>' +

      '<div class="group"><div class="group-title">Discovery</div><div class="list-card">' +
      '<div class="item"><span class="grow">Android detection<small class="hint">' +
      (host ? 'Available · lists launchable apps on this device' : 'Only available in the Android app') + '</small></span>' +
      '<span class="value">' + (host ? 'On' : 'Unavailable') + '</span></div>' +
      '</div></div>' +

      '<div class="group"><div class="group-title">Artwork &amp; catalogue</div><div class="list-card">' +
      toggleItem('Automatic artwork', 'Prefer retrieved artwork unless you replaced it', 'toggle-auto-art', s.autoArtwork) +
      '<div class="item"><span class="grow">Catalogue key<small class="hint">' +
      (s.catalogueKey ? 'Saved on this device' : 'Not set · catalogue search disabled') + '</small></span>' +
      '<button type="button" class="btn" style="min-height:36px;padding:6px 12px" data-act="edit-catalogue-key">' +
      (s.catalogueKey ? 'Change' : 'Add') + '</button></div>' +
      '<button type="button" class="item" data-act="clear-art"><span class="grow">Clear cached artwork<small class="hint">' +
      artCount + ' image' + (artCount === 1 ? '' : 's') + ' stored offline</small></span><span class="value">›</span></button>' +
      '</div></div>' +

      '<div class="group"><div class="group-title">Activity</div><div class="list-card">' +
      toggleItem('Track activity', 'Record adds, launches and status changes', 'toggle-track', s.trackActivity) +
      '<button type="button" class="item" data-act="clear-activity"><span class="grow">Clear timeline<small class="hint">' +
      db.activity.length + ' events · statistics keep their records</small></span><span class="value">›</span></button>' +
      '</div></div>' +

      '<div class="group"><div class="group-title">Storage &amp; backup</div><div class="list-card">' +
      '<div class="item"><span class="grow">Library data<small class="hint">' + db.games.length + ' games · ' +
      db.collections.length + ' collections · ' + artCount + ' artwork files</small></span></div>' +
      '<button type="button" class="item" data-act="export-backup"><span class="grow">Export backup<small class="hint">Games, collections, profile and artwork in one file</small></span>' +
      icon('download') + '</button>' +
      '<button type="button" class="item" data-act="import-backup"><span class="grow">Restore backup<small class="hint">Replaces your current library after confirmation</small></span>' +
      icon('upload') + '</button>' +
      '<button type="button" class="item danger" data-act="delete-data"><span class="grow">Delete all data<small class="hint">Removes every game, collection and artwork</small></span>' +
      icon('trash') + '</button>' + '</div></div>' +

      '<div class="group"><div class="group-title">Privacy</div><div class="list-card">' +
      '<div class="item"><span class="grow">Local-only storage<small class="hint">No account, no cloud sync. Catalogue searches send only your query to the provider you configured.</small></span></div>' +
      '<div class="item"><span class="grow">Permissions<small class="hint">Internet (catalogue and artwork), vibration (haptics). GameVault never reads your files.</small></span></div>' +
      '</div></div>' +

      '<div class="group"><div class="group-title">About</div><div class="list-card">' +
      '<div class="item"><span class="grow">GameVault<small class="hint">Version ' + esc(APP_VERSION()) + ' · local-first gaming library</small></span></div>' +
      '<div class="item"><span class="grow">Catalogue provider<small class="hint">RAWG · attribution required by the provider when enabled</small></span></div>' +
      '</div></div>' +

      '</div></div>';
  }

  function toggleItem(title, hint, action, checked) {
    return '<button type="button" class="item" data-act="' + action + '" role="switch" aria-checked="' + !!checked + '">' +
      '<span class="grow">' + esc(title) + '<small class="hint">' + esc(hint) + '</small></span>' +
      '<span class="switch" aria-checked="' + !!checked + '"></span></button>';
  }

  function APP_VERSION() {
    try {
      if (host && host.appVersion) return host.appVersion();
    } catch (e) { /* ignore */ }
    return '1.1';
  }

  const SCREENS = {
    home: screenHome,
    library: screenLibrary,
    add: screenAdd,
    activity: screenActivity,
    profile: screenProfile,
    game: screenGame,
    collections: screenCollections,
    collection: screenCollection,
    settings: screenSettings,
  };

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */

  const app = $('#app');
  const tabbar = $('#tabbar');
  const overlay = $('#overlay');
  const toastEl = $('#toast');
  const fileInput = $('#file-input');

  function render() {
    const view = state.stack[state.stack.length - 1];
    document.documentElement.dataset.accent = db.settings.accent;
    if (db.settings.reduceMotion) document.documentElement.dataset.motion = 'reduced';
    else delete document.documentElement.dataset.motion;

    const builder = SCREENS[view.screen] || SCREENS.home;
    app.innerHTML = builder(view.params || {});
    renderTabbar();
  }

  function renderTabbar() {
    const tabs = [
      ['home', 'Home', 'home'],
      ['library', 'Library', 'grid'],
      ['add', 'Add', 'plus'],
      ['activity', 'Activity', 'clock'],
      ['profile', 'Profile', 'user'],
    ];
    tabbar.innerHTML = tabs.map(([id, label, iconName]) => {
      const active = state.activeTab === id;
      if (id === 'add') {
        return '<button type="button" class="tab add-tab" data-act="tab-add" aria-label="Add games">' +
          '<span class="plus">' + icon(iconName) + '</span><span>Add</span></button>';
      }
      return '<button type="button" class="tab" data-act="tab-' + id + '"' + (active ? ' aria-current="page"' : '') + '>' +
        icon(iconName) + '<span>' + label + '</span></button>';
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Modal + toast
   * ------------------------------------------------------------------ */

  let modalTimer = null;

  function openModal(html) {
    overlay.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    overlay.hidden = false;
    state.modalOpen = true;
  }

  function closeModal() {
    if (!state.modalOpen) return;
    overlay.innerHTML = '';
    overlay.hidden = true;
    state.modalOpen = false;
  }

  function toast(message, isError) {
    toastEl.textContent = message;
    toastEl.className = 'toast' + (isError ? ' error' : '');
    toastEl.hidden = false;
    clearTimeout(modalTimer);
    modalTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */

  function setStatus(game, status) {
    if (game.status === status) return;
    game.status = status;
    logEvent(status === 'completed' ? 'completed' : 'status', game.title, game.id, status);
    persist();
    haptic(10);
    render();
  }

  function launchGame(game) {
    const version = (game.platforms || []).find((p) => p.appId);
    if (!version || !host) { toast('No launchable Android version for this game.', true); return; }
    let result;
    try { result = JSON.parse(host.launchApp(version.appId)); } catch (e) { result = { ok: false, message: 'Launch failed' }; }
    if (!result.ok) { toast(result.message || 'Could not launch this game.', true); return; }
    game.launchCount += 1;
    game.lastPlayedAt = Date.now();
    logEvent('launched', game.title, game.id);
    persist();
    haptic(18);
    toast('Launched ' + game.title);
    render();
  }

  function saveGameForm(form) {
    const data = new FormData(form);
    const id = String(data.get('id') || '');
    const title = String(data.get('title') || '').trim();
    if (!title) { toast('A title is required.', true); return; }

    const platforms = state.formPlatforms.slice();
    const base = {
      title,
      franchise: String(data.get('franchise') || '').trim(),
      genres: String(data.get('genres') || '').split(',').map((g) => g.trim()).filter(Boolean),
      platforms,
      status: String(data.get('status') || 'backlog'),
      rating: Number(data.get('rating') || 0),
      description: String(data.get('description') || '').trim(),
      developer: String(data.get('developer') || '').trim(),
      publisher: String(data.get('publisher') || '').trim(),
      releaseDate: String(data.get('releaseDate') || ''),
      notes: String(data.get('notes') || '').trim(),
    };

    const existing = id ? gameById(id) : null;
    if (existing) {
      const kept = (existing.platforms || []).filter((p) => platforms.includes(p.name));
      Object.assign(existing, base, { platforms: mergePlatforms(kept, platforms) });
      if (state.formArtwork) {
        existing.coverKey = state.formArtwork;
        existing.backgroundKey = existing.backgroundKey || state.formArtwork;
        existing.customArt = true;
        state.formArtwork = null;
      }
      persist();
      closeModal();
      render();
      toast('Saved');
      return;
    }

    const duplicate = db.games.find((g) => g.title.toLowerCase() === title.toLowerCase());
    if (duplicate) {
      duplicate.platforms = mergePlatforms(duplicate.platforms, platforms, true);
      persist();
      closeModal();
      render();
      toast('Added platforms to the existing ' + duplicate.title);
      return;
    }

    const game = normalizeGame({
      ...base,
      id: uid(),
      addedAt: Date.now(),
      source: 'manual',
      coverKey: state.formArtwork || null,
    });
    state.formArtwork = null;
    db.games.push(game);
    logEvent('added', game.title, game.id);
    persist();
    closeModal();
    haptic(12);
    go('game', { id: game.id });
    toast('Added to library');
  }

  function mergePlatforms(current, incoming, fillMissing) {
    const out = (current || []).slice();
    (incoming || []).forEach((name) => {
      if (typeof name !== 'string') return;
      if (!out.some((p) => p.name === name)) out.push({ name, appId: null });
    });
    if (fillMissing && !out.length) out.push({ name: 'Other', appId: null });
    return out;
  }

  function deleteGame(game) {
    openModal('<div class="sheet-head"><h2>Remove ' + esc(game.title) + '?</h2></div>' +
      '<p class="desc">This removes the game, its personal data and its collection entries. Export a backup first if you might want it back.</p>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button><span class="spacer"></span>' +
      '<button type="button" class="btn danger" data-act="confirm-delete-game" data-id="' + esc(game.id) + '">Remove</button></div>');
  }

  function openGameEditor(game) {
    openModal('<form id="form-game-edit">' +
      '<input type="hidden" name="id" value="' + esc(game ? game.id : '') + '">' +
      '<div class="sheet-head"><h2>' + (game ? 'Edit game' : 'Add game') + '</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      gameFormFields(game || { title: '', franchise: '', genres: [], platforms: [], status: 'backlog', rating: 0, notes: '', description: '', developer: '', publisher: '', releaseDate: '' }) +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button type="submit" class="btn primary">Save</button></div></form>');
  }

  function openFilters() {
    const genres = [...new Set(db.games.flatMap((g) => g.genres || []))].sort();
    const f = state.filter;
    openModal('<div class="sheet-head"><h2>Filters</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      '<label class="field"><span>Platform</span><select data-filter="platform">' +
      '<option value="all">Any platform</option>' + PLATFORMS.map((p) =>
        '<option value="' + esc(p) + '"' + (f.platform === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Genre</span><select data-filter="genre"><option value="all">Any genre</option>' +
      genres.map((g) => '<option value="' + esc(g) + '"' + (f.genre === g ? ' selected' : '') + '>' + esc(g) + '</option>').join('') +
      '</select></label>' +
      '<label class="field"><span>Installed status</span><select data-filter="installed">' +
      [['all', 'Any'], ['yes', 'Installed on this device'], ['no', 'Not installed']].map(([id, label]) =>
        '<option value="' + id + '"' + (f.installed === id ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Completion</span><select data-filter="completion">' +
      [['all', 'Any'], ['completed', 'Completed only'], ['incomplete', 'Not completed']].map(([id, label]) =>
        '<option value="' + id + '"' + (f.completion === id ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></label>' +
      '<button type="button" class="item" data-act="toggle-fav-filter" role="switch" aria-checked="' + f.favorites + '">' +
      '<span class="grow">Favorites only</span><span class="switch" aria-checked="' + f.favorites + '"></span></button>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="clear-filters">Clear all</button>' +
      '<span class="spacer"></span><button type="button" class="btn primary" data-act="close-modal">Show ' +
      visibleGames().length + ' games</button></div>');
  }

  function openCollectionPicker(game) {
    openModal('<div class="sheet-head"><h2>Add to collection</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      (db.collections.length ? '<div class="picker-list">' + db.collections.map((c) => {
        const inside = c.gameIds.includes(game.id);
        return '<button type="button" class="discover-row" data-act="collection-toggle-game" data-collection="' + esc(c.id) +
          '" data-game="' + esc(game.id) + '" aria-pressed="' + inside + '">' +
          '<div class="info" style="flex:1"><div class="title">' + esc(c.name) + '</div>' +
          '<div class="meta">' + c.gameIds.length + ' games</div></div>' +
          '<span class="check">' + icon('check') + '</span></button>';
      }).join('') + '</div>' : '<p class="desc">You have no collections yet.</p>') +
      '<div class="form-actions"><button type="button" class="btn" data-act="new-collection">New collection</button></div>');
  }

  function openCollectionAdd(collection) {
    const candidates = db.games.filter((g) => !collection.gameIds.includes(g.id));
    openModal('<div class="sheet-head"><h2>Add games</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      (candidates.length ? '<div class="picker-list">' + candidates.map((g) =>
        '<button type="button" class="discover-row" data-act="collection-toggle-game" data-collection="' + esc(collection.id) +
        '" data-game="' + esc(g.id) + '">' + coverHtml(g) +
        '<div class="info" style="flex:1"><div class="title">' + esc(g.title) + '</div>' +
        '<div class="meta">' + esc(platformNames(g)) + '</div></div><span class="check">' + icon('check') + '</span></button>').join('') +
        '</div>' : '<p class="desc">Every game is already in this collection.</p>'));
  }

  function openNewCollection() {
    openModal('<form id="form-new-collection">' +
      '<div class="sheet-head"><h2>New collection</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      '<label class="field"><span>Name</span><input name="name" required maxlength="60" placeholder="e.g. Resident Evil"></label>' +
      '<p class="desc">Collections group games across platforms. A game can live in several collections.</p>' +
      '<button class="btn primary block" type="submit">Create collection</button></form>');
  }

  function openRenameCollection(collection) {
    openModal('<form id="form-rename-collection">' +
      '<input type="hidden" name="id" value="' + esc(collection.id) + '">' +
      '<div class="sheet-head"><h2>Rename collection</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      '<label class="field"><span>Name</span><input name="name" required maxlength="60" value="' + esc(collection.name) + '"></label>' +
      '<button class="btn primary block" type="submit">Save name</button></form>');
  }

  function openPlatformPicker(game) {
    openModal('<div class="sheet-head"><h2>Add platform version</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      '<div class="chips" style="flex-wrap:wrap;margin-bottom:12px">' + PLATFORMS.map((p) =>
        '<button type="button" class="chip small" data-act="platform-add" data-id="' + esc(game.id) +
        '" data-platform="' + esc(p) + '">' + esc(p) + '</button>').join('') + '</div>' +
      '<form id="form-custom-platform"><input type="hidden" name="id" value="' + esc(game.id) + '">' +
      '<label class="field"><span>Custom platform</span><input name="name" placeholder="e.g. Retro handheld" maxlength="40"></label>' +
      '<button class="btn block" type="submit">Add custom platform</button></form>');
  }

  function openProfileEditor() {
    const p = db.profile;
    openModal('<form id="form-profile"><div class="sheet-head"><h2>Edit profile</h2>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      '<label class="field"><span>Username</span><input name="username" maxlength="40" value="' + esc(p.username) + '"></label>' +
      '<label class="field"><span>Short biography</span><textarea name="bio" maxlength="240" rows="3">' + esc(p.bio) + '</textarea></label>' +
      '<div class="field"><span>Favorite platforms</span><div class="chips" style="flex-wrap:wrap">' +
      PLATFORMS.map((platform) => '<button type="button" class="chip small" data-act="profile-platform" data-platform="' +
        esc(platform) + '" aria-pressed="' + ((p.favoritePlatforms || []).includes(platform)) + '">' + esc(platform) + '</button>').join('') +
      '</div></div>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="change-avatar">Change image</button>' +
      '<span class="spacer"></span><button type="submit" class="btn primary">Save</button></div></form>');
  }

  function openCatalogueKey() {
    openModal('<form id="form-catalogue-key" class="panel">' +
      '<div class="sheet-head"><h2>Catalogue key</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">×</button></div>' +
      '<label class="field"><span>RAWG API key</span><input name="key" autocomplete="off" value="' + esc(db.settings.catalogueKey) + '"></label>' +
      '<p class="desc">Stored only on this device and sent only to api.rawg.io. Leave empty to disable online search.</p>' +
      '<button class="btn primary block" type="submit">Save key</button></form>');
  }

  function openAvatarPicker() {
    state.pendingArt = { kind: 'avatar' };
    fileInput.value = '';
    fileInput.click();
  }

  /* ------------------------------------------------------------------ *
   * Event delegation
   * ------------------------------------------------------------------ */

  function onClick(e) {
    const target = e.target.closest('[data-act]');
    if (!target) {
      if (e.target === overlay) closeModal();
      return;
    }
    const act = target.dataset.act;
    const id = target.dataset.id;

    switch (act) {
      case 'back': back(); break;
      case 'tab-home': tabTo('home'); break;
      case 'tab-library': tabTo('library'); break;
      case 'tab-add': tabTo('add'); break;
      case 'tab-activity': tabTo('activity'); break;
      case 'tab-profile': tabTo('profile'); break;
      case 'open-settings': go('settings'); break;
      case 'open-collections': go('collections'); break;
      case 'open-collection': go('collection', { id }); break;
      case 'open-game': go('game', { id }); break;
      case 'close-modal': closeModal(); break;
      case 'edit-game': openGameEditor(gameById(id)); break;
      case 'set-status': {
        const game = gameById(id);
        if (game) setStatus(game, target.dataset.status);
        break;
      }
      case 'rate': {
        const game = gameById(id);
        if (game) { game.rating = Number(target.dataset.value); persist(); haptic(8); render(); }
        break;
      }
      case 'toggle-fav': {
        const game = gameById(id);
        if (game) { game.favorite = !game.favorite; persist(); haptic(10); render(); }
        break;
      }
      case 'toggle-wish': {
        const game = gameById(id);
        if (game) { game.wishlist = !game.wishlist; persist(); haptic(10); render(); }
        break;
      }
      case 'toggle-profile-fav': {
        const list = db.profile.favoriteGameIds || (db.profile.favoriteGameIds = []);
        const index = list.indexOf(id);
        if (index >= 0) list.splice(index, 1);
        else { list.unshift(id); if (list.length > 8) list.length = 8; }
        persist();
        haptic(10);
        toast(index >= 0 ? 'Removed from profile favorites' : 'Added to profile favorites');
        render();
        break;
      }
      case 'launch': {
        const game = gameById(id);
        if (game) launchGame(game);
        break;
      }
      case 'delete-game': {
        const game = gameById(id);
        if (game) deleteGame(game);
        break;
      }
      case 'confirm-delete-game': {
        const game = gameById(id);
        if (game) {
          db.games = db.games.filter((g) => g.id !== game.id);
          db.collections.forEach((c) => { c.gameIds = c.gameIds.filter((gid) => gid !== game.id); });
          db.profile.favoriteGameIds = (db.profile.favoriteGameIds || []).filter((gid) => gid !== game.id);
          logEvent('removed', game.title, null);
          persist();
          closeModal();
          tabTo('library');
          toast('Removed ' + game.title);
        }
        break;
      }
      case 'add-platform': {
        const game = gameById(id);
        if (game) openPlatformPicker(game);
        break;
      }
      case 'platform-add': {
        const game = gameById(target.dataset.id);
        if (game) {
          const name = target.dataset.platform;
          if (!(game.platforms || []).some((p) => p.name === name)) {
            game.platforms = (game.platforms || []).concat({ name, appId: null });
            persist();
          }
          closeModal();
          render();
        }
        break;
      }
      case 'remove-platform': {
        const game = gameById(id);
        if (game) {
          game.platforms.splice(Number(target.dataset.index), 1);
          persist();
          render();
        }
        break;
      }
      case 'add-to-collection': {
        const game = gameById(id);
        if (game) openCollectionPicker(game);
        break;
      }
      case 'collection-toggle-game': {
        const collection = collectionById(target.dataset.collection);
        const gameId = target.dataset.game;
        if (collection) {
          const index = collection.gameIds.indexOf(gameId);
          if (index >= 0) collection.gameIds.splice(index, 1);
          else collection.gameIds.push(gameId);
          persist();
          haptic(8);
          target.setAttribute('aria-pressed', String(index < 0));
          if (state.modalOpen) {
            const inModal = target.getAttribute('aria-pressed') === 'true';
            target.querySelector('.check') && (target.querySelector('.check').textContent = inModal ? '✓' : '');
          }
          render();
        }
        break;
      }
      case 'new-collection': openNewCollection(); break;
      case 'rename-collection': {
        const collection = collectionById(id);
        if (collection) openRenameCollection(collection);
        break;
      }
      case 'fav-collection': {
        const collection = collectionById(id);
        if (collection) { collection.favorite = !collection.favorite; persist(); haptic(10); render(); }
        break;
      }
      case 'delete-collection': {
        const collection = collectionById(id);
        if (!collection) break;
        openModal('<div class="sheet-head"><h2>Delete "' + esc(collection.name) + '"?</h2></div>' +
          '<p class="desc">The collection is removed. Its games stay in your library.</p>' +
          '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button>' +
          '<span class="spacer"></span><button type="button" class="btn danger" data-act="confirm-delete-collection" data-id="' +
          esc(collection.id) + '">Delete</button></div>');
        break;
      }
      case 'confirm-delete-collection': {
        const collection = collectionById(id);
        if (!collection) break;
        db.collections = db.collections.filter((c) => c.id !== id);
        persist();
        closeModal();
        tabTo('collections');
        break;
      }
      case 'confirm-clear-art': { clearArtworkNow(); break; }
      case 'confirm-clear-activity': { clearActivityNow(); break; }
      case 'confirm-restore': { restorePending(); break; }
      case 'collection-add': {
        const collection = collectionById(id);
        if (collection) openCollectionAdd(collection);
        break;
      }
      case 'collection-remove': {
        const collection = collectionById(id);
        if (collection) {
          collection.gameIds = collection.gameIds.filter((gid) => gid !== target.dataset.game);
          persist();
          render();
        }
        break;
      }
      case 'reorder-toggle': state.reorder = !state.reorder; render(); break;
      case 'move-game': {
        const collection = collectionById(id);
        if (!collection) break;
        const index = Number(target.dataset.index);
        const dir = Number(target.dataset.dir);
        const next = index + dir;
        if (next < 0 || next >= collection.gameIds.length) break;
        const [moved] = collection.gameIds.splice(index, 1);
        collection.gameIds.splice(next, 0, moved);
        persist();
        render();
        break;
      }
      case 'change-art': {
        const kind = target.dataset.target;
        if (kind === 'avatar') { openAvatarPicker(); break; }
        state.pendingArt = { kind: kind === 'background' ? 'background' : 'cover', id: target.dataset.id || null, collection: null };
        fileInput.value = '';
        fileInput.click();
        break;
      }
      case 'collection-art': {
        state.pendingArt = { kind: 'collection', id: target.dataset.id };
        fileInput.value = '';
        fileInput.click();
        break;
      }
      case 'change-avatar': openAvatarPicker(); break;
      case 'edit-profile': openProfileEditor(); break;
      case 'profile-platform': {
        const platform = target.dataset.platform;
        const list = db.profile.favoritePlatforms || (db.profile.favoritePlatforms = []);
        const index = list.indexOf(platform);
        if (index >= 0) list.splice(index, 1);
        else list.push(platform);
        persist();
        target.setAttribute('aria-pressed', String(index < 0));
        target.classList.toggle('active');
        break;
      }
      case 'add-tab': state.addTab = target.dataset.tab; render(); break;
      case 'discover-scan': scanDevice(); break;
      case 'discover-toggle': {
        const pkg = target.dataset.pkg;
        if (gameForPackage(pkg)) { toast('Already in your library.'); break; }
        if (state.selected.has(pkg)) state.selected.delete(pkg);
        else state.selected.add(pkg);
        target.setAttribute('aria-pressed', String(state.selected.has(pkg)));
        haptic(8);
        render();
        break;
      }
      case 'discover-add': addDiscovered(); break;
      case 'catalogue-add': addFromCatalogue(Number(target.dataset.index)); break;
      case 'form-platform': {
        const platform = target.dataset.platform;
        const index = state.formPlatforms.indexOf(platform);
        if (index >= 0) state.formPlatforms.splice(index, 1);
        else state.formPlatforms.push(platform);
        target.setAttribute('aria-pressed', String(index < 0));
        break;
      }
      case 'set-view': state.view = target.dataset.view; db.settings.view = state.view; persist(); render(); break;
      case 'filter-status': state.filter.status = target.dataset.status; render(); break;
      case 'clear-filters':
        state.filter = { platform: 'all', genre: 'all', status: 'all', favorites: false, installed: 'all', completion: 'all' };
        state.query = '';
        render();
        break;
      case 'open-filters': openFilters(); break;
      case 'toggle-fav-filter':
        state.filter.favorites = !state.filter.favorites;
        persist();
        closeModal(true);
        render();
        openFilters();
        break;
      case 'set-accent':
        db.settings.accent = target.dataset.accent;
        persist();
        haptic(10);
        render();
        break;
      case 'toggle-motion': db.settings.reduceMotion = !db.settings.reduceMotion; persist(); render(); break;
      case 'toggle-haptics': db.settings.haptics = !db.settings.haptics; persist(); render(); break;
      case 'toggle-auto-art': db.settings.autoArtwork = !db.settings.autoArtwork; persist(); render(); break;
      case 'toggle-track': db.settings.trackActivity = !db.settings.trackActivity; persist(); render(); break;
      case 'edit-catalogue-key': openCatalogueKey(); break;
      case 'clear-art': clearArtwork(); break;
      case 'clear-activity': clearActivity(); break;
      case 'export-backup': exportBackup(); break;
      case 'import-backup': importBackup(); break;
      case 'delete-data': confirmDeleteAll(); break;
      case 'confirm-delete-all': deleteAllData(); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------------ *
   * Device discovery
   * ------------------------------------------------------------------ */

  function scanDevice() {
    if (!host) { toast('Device discovery is only available in the app.', true); return; }
    state.discoveryBusy = true;
    state.selected.clear();
    render();
    setTimeout(() => {
      try {
        const raw = host.getInstalledApps();
        const list = JSON.parse(raw || '[]');
        state.discovery = list.map((app) => ({
          packageName: String(app.packageName || app.package || ''),
          label: String(app.label || app.packageName || 'Unknown app'),
          icon: String(app.icon || ''),
        })).filter((a) => a.packageName);
      } catch (e) {
        state.discovery = [];
        toast('Could not read installed apps.', true);
      }
      state.discoveryBusy = false;
      render();
    }, 60);
  }

  async function addDiscovered() {
    if (!state.selected.size) return;
    const apps = (state.discovery || []).filter((a) => state.selected.has(a.packageName));
    let added = 0;
    for (const app of apps) {
      if (gameForPackage(app.packageName)) continue;
      let coverKey = null;
      if (app.icon && app.icon.startsWith('data:')) {
        try { coverKey = await Art.put(app.icon); } catch (e) { coverKey = null; }
      }
      const game = normalizeGame({
        id: uid(),
        title: app.label,
        platforms: [{ name: 'Android', appId: app.packageName }],
        status: 'backlog',
        addedAt: Date.now(),
        coverKey,
        source: 'discovery',
      });
      db.games.push(game);
      logEvent('added', game.title, game.id);
      added += 1;
    }
    state.selected.clear();
    persist();
    haptic(14);
    if (added) {
      toast('Added ' + added + ' game' + (added === 1 ? '' : 's'));
      tabTo('library');
    } else {
      render();
    }
  }

  /* ------------------------------------------------------------------ *
   * Catalogue (RAWG adapter)
   * ------------------------------------------------------------------ */

  async function saveCatalogueKey(form) {
    const key = String(new FormData(form).get('key') || '').trim();
    db.settings.catalogueKey = key;
    persist();
    closeModal(true);
    render();
    toast(key ? 'Catalogue key saved' : 'Catalogue disabled');
  }

  async function runCatalogueSearch(query) {
    const key = (db.settings.catalogueKey || '').trim();
    const q = String(query || '').trim();
    state.catalogueQuery = q;
    if (!key) { toast('Add a catalogue key first.', true); return; }
    if (!q) { toast('Enter a game title to search.'); return; }

    state.catalogueBusy = true;
    state.catalogueError = '';
    state.catalogue = null;
    state.addTab = 'catalogue';
    render();

    try {
      const url = 'https://api.rawg.io/api/games?key=' + encodeURIComponent(key) +
        '&search=' + encodeURIComponent(q) + '&page_size=20&search_precise=true';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Provider returned ' + response.status + '.');
      const data = await response.json();
      state.catalogue = (data.results || []).map((item) => ({
        id: item.id,
        title: item.name,
        released: item.released || '',
        image: item.background_image || '',
        platforms: (item.platforms || []).map((p) => mapPlatform(p.platform && p.platform.name)).filter(Boolean),
      }));
    } catch (err) {
      state.catalogueError = err && err.message ? err.message : 'Network request failed.';
    }
    state.catalogueBusy = false;
    render();
  }

  async function addFromCatalogue(index) {
    const item = (state.catalogue || [])[index];
    if (!item) return;
    const key = (db.settings.catalogueKey || '').trim();
    let detail = null;
    try {
      if (key) {
        const response = await fetch('https://api.rawg.io/api/games/' + item.id + '?key=' + encodeURIComponent(key));
        if (response.ok) detail = await response.json();
      }
    } catch (e) { detail = null; }

    const platforms = (item.platforms || []).map((name) => ({ name, appId: null }));
    const meta = normalizeGame({
      id: uid(),
      title: item.title,
      franchise: (detail && detail.series && detail.series[0] && (detail.series[0].name || detail.series[0])) || '',
      description: stripHtml((detail && (detail.description_raw || detail.description)) || ''),
      developer: detail && detail.developers ? detail.developers.map((d) => d.name).join(', ') : '',
      publisher: detail && detail.publishers ? detail.publishers.map((p) => p.name).join(', ') : '',
      releaseDate: (detail && detail.released) || item.released || '',
      genres: detail && detail.genres ? detail.genres.map((g) => g.name) : [],
      platforms,
      status: 'backlog',
      addedAt: Date.now(),
      coverUrl: item.image || null,
      source: 'catalogue',
      rating: 0,
    });

    const duplicate = db.games.find((g) => g.title.toLowerCase() === meta.title.toLowerCase());
    if (duplicate) {
      duplicate.platforms = mergePlatforms(duplicate.platforms, platforms.map((p) => p.name), true);
      if (!duplicate.description && meta.description) duplicate.description = meta.description;
      persist();
      toast('Merged into existing ' + duplicate.title);
      go('game', { id: duplicate.id });
      return;
    }

    if (item.image && db.settings.autoArtwork) {
      try {
        const response = await fetch(item.image);
        const blob = await response.blob();
        const dataUrl = await shrinkImage(blob, 900);
        if (dataUrl) {
          meta.coverKey = await Art.put(dataUrl);
          meta.backgroundKey = meta.coverKey;
        }
      } catch (e) { /* keep remote URL fallback */ }
    }

    db.games.push(meta);
    logEvent('added', meta.title, meta.id);
    persist();
    haptic(14);
    toast('Added ' + meta.title);
    go('game', { id: meta.id });
  }

  function stripHtml(html) {
    return String(html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim().slice(0, 2000);
  }

  /* ------------------------------------------------------------------ *
   * Artwork handling
   * ------------------------------------------------------------------ */

  function shrinkImage(blob, maxSize) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(null);
        img.src = String(reader.result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  async function handleFile(file) {
    const pending = state.pendingArt;
    if (!pending || !file) return;
    const dataUrl = await shrinkImage(file, pending.kind === 'avatar' ? 512 : 1100);
    if (!dataUrl) { toast('Could not read that image.', true); return; }

    if (pending.kind === 'avatar') {
      const key = await Art.put(dataUrl);
      db.profile.avatarKey = key;
      persist();
      render();
      toast('Profile image updated');
      return;
    }

    if (pending.kind === 'collection') {
      const collection = collectionById(pending.id);
      if (collection) {
        collection.artworkKey = await Art.put(dataUrl);
        persist();
        render();
        toast('Collection artwork updated');
      }
      return;
    }

    const game = pending.id ? gameById(pending.id) : null;
    if (game) {
      const key = await Art.put(dataUrl);
      if (pending.kind === 'background') game.backgroundKey = key;
      else { game.coverKey = key; game.backgroundKey = game.backgroundKey || key; }
      game.customArt = true;
      logEvent('artwork', game.title, game.id);
      persist();
      render();
      toast('Artwork updated');
      return;
    }

    state.formArtwork = await Art.put(dataUrl);
    toast('Artwork attached — save the game to keep it');
  }

  function clearArtwork() {
    openModal('<div class="sheet-head"><h2>Clear cached artwork?</h2></div>' +
      '<p class="desc">Every stored image is deleted, including covers you added. Games, notes and collections stay.</p>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button type="button" class="btn danger" data-act="confirm-clear-art">Clear artwork</button></div>');
  }

  async function clearArtworkNow() {
    await Art.clear();
    Object.keys(ART).forEach((k) => delete ART[k]);
    db.games.forEach((g) => { g.coverKey = null; g.backgroundKey = null; });
    db.collections.forEach((c) => { c.artworkKey = null; });
    db.profile.avatarKey = null;
    persist();
    render();
    toast('Artwork cache cleared');
  }

  /* ------------------------------------------------------------------ *
   * Backup
   * ------------------------------------------------------------------ */

  async function buildBackup() {
    const art = {};
    const referenced = new Set();
    db.games.forEach((g) => { if (g.coverKey) referenced.add(g.coverKey); if (g.backgroundKey) referenced.add(g.backgroundKey); });
    db.collections.forEach((c) => { if (c.artworkKey) referenced.add(c.artworkKey); });
    if (db.profile.avatarKey) referenced.add(db.profile.avatarKey);
    referenced.forEach((key) => { if (ART[key]) art[key] = ART[key]; });

    return JSON.stringify({
      app: 'GameVault',
      schema: SCHEMA,
      exportedAt: new Date().toISOString(),
      data: {
        games: db.games,
        collections: db.collections,
        activity: db.activity,
        profile: db.profile,
        settings: { ...db.settings, catalogueKey: '' },
      },
      artwork: art,
    });
  }

  async function exportBackup() {
    const json = await buildBackup();
    const name = 'gamevault-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    if (host && host.exportBackup) {
      host.exportBackup(json, name);
      toast('Choose where to save the backup');
      return;
    }
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Backup downloaded');
    } catch (e) {
      toast('Could not export the backup.', true);
    }
  }

  function importBackup() {
    if (host && host.importBackup) {
      host.importBackup();
      toast('Choose a GameVault backup file');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => applyBackup(String(reader.result || ''));
      reader.readAsText(file);
    };
    input.click();
  }

  window.__gvImportBackup = (json) => applyBackup(json);

  async function applyBackup(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      toast('That file is not valid JSON.', true);
      return;
    }
    const payload = parsed && parsed.data ? parsed.data : parsed;
    if (!payload || !Array.isArray(payload.games)) {
      toast('That file is not a GameVault backup.', true);
      return;
    }

    state.pendingRestore = parsed;

    openModal('<div class="sheet-head"><h2>Restore this backup?</h2></div>' +
      '<p class="desc">The file contains <b>' + payload.games.length + '</b> games. Restoring replaces your current library of ' +
      db.games.length + ' games, its collections and profile. Export a backup first if you might want the current data back.</p>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button type="button" class="btn danger" data-act="confirm-restore">Replace library</button></div>');
  }

  async function restorePending() {
    const parsed = state.pendingRestore;
    if (!parsed) return;
    const payload = parsed.data || parsed;
    const restored = {
      schema: SCHEMA,
      games: (payload.games || []).map(normalizeGame).filter(Boolean),
      collections: (payload.collections || []).map(normalizeCollection),
      activity: Array.isArray(payload.activity) ? payload.activity.slice(0, 800) : [],
      profile: { ...DEFAULT_PROFILE, ...(payload.profile || {}) },
      settings: { ...db.settings, ...(payload.settings || {}) },
    };

    const artwork = parsed.artwork || {};
    for (const [key, value] of Object.entries(artwork)) {
      if (typeof value === 'string' && value.startsWith('data:')) ART[key] = value;
    }

    state.pendingRestore = null;
    db = restored;
    persist();
    closeModal();
    tabTo('home');
    toast('Backup restored · ' + restored.games.length + ' games');
  }

  function clearActivity() {
    openModal('<div class="sheet-head"><h2>Clear the timeline?</h2></div>' +
      '<p class="desc">Recorded events are removed. Launch counts and other statistics stored on games are kept.</p>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button type="button" class="btn danger" data-act="confirm-clear-activity">Clear timeline</button></div>');
  }

  function clearActivityNow() {
    db.activity = [];
    persist();
    closeModal();
    render();
    toast('Timeline cleared');
  }

  function confirmDeleteAll() {
    openModal('<div class="sheet-head"><h2>Delete all data?</h2></div>' +
      '<p class="desc">Every game, collection, note and artwork will be removed from this device. This cannot be undone.</p>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button type="button" class="btn danger" data-act="confirm-delete-all">Delete everything</button></div>');
  }

  async function deleteAllData() {
    db = emptyDb();
    persist();
    await Art.clear();
    Object.keys(ART).forEach((k) => delete ART[k]);
    closeModal(true);
    tabTo('home');
    toast('All local data deleted');
  }

  /* ------------------------------------------------------------------ *
   * Form + input handling
   * ------------------------------------------------------------------ */

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || !form.id) return;
    if (form.id === 'form-game' || form.id === 'form-game-edit') {
      e.preventDefault();
      saveGameForm(form);
    } else if (form.id === 'form-new-collection') {
      e.preventDefault();
      const name = String(new FormData(form).get('name') || '').trim();
      if (!name) return;
      const collection = normalizeCollection({ name, gameIds: [] });
      db.collections.push(collection);
      persist();
      closeModal();
      go('collection', { id: collection.id });
      toast('Collection created');
    } else if (form.id === 'form-rename-collection') {
      e.preventDefault();
      const data = new FormData(form);
      const collection = collectionById(String(data.get('id') || ''));
      const name = String(data.get('name') || '').trim();
      if (collection && name) {
        collection.name = name;
        persist();
        closeModal();
        render();
      }
    } else if (form.id === 'form-catalogue') {
      e.preventDefault();
      runCatalogueSearch(form.elements.q.value);
    } else if (form.id === 'form-catalogue-key') {
      e.preventDefault();
      saveCatalogueKey(form);
    } else if (form.id === 'form-profile') {
      e.preventDefault();
      const data = new FormData(form);
      db.profile.username = String(data.get('username') || '').trim().slice(0, 40) || 'Player One';
      db.profile.bio = String(data.get('bio') || '').trim().slice(0, 240);
      persist();
      closeModal(true);
      render();
      toast('Profile saved');
    } else if (form.id === 'form-custom-platform') {
      e.preventDefault();
      const data = new FormData(form);
      const game = gameById(String(data.get('id') || ''));
      const name = String(data.get('name') || '').trim();
      if (game && name) {
        if (!(game.platforms || []).some((p) => p.name === name)) {
          game.platforms = (game.platforms || []).concat({ name, appId: null });
          persist();
        }
        closeModal(true);
        render();
      }
    }
  });

  document.addEventListener('click', onClick);

  document.addEventListener('input', (e) => {
    if (e.target.id === 'lib-search') {
      state.query = e.target.value;
      const items = visibleGames();
      const body = $('#lib-body');
      const count = $('#lib-count');
      if (body) body.innerHTML = libraryBody(items);
      if (count) count.textContent = resultLabel(items.length);
    } else if (e.target.id === 'disc-search') {
      state.discoveryQuery = e.target.value;
      const scroll = window.scrollY;
      render();
      window.scrollTo(0, scroll);
      const field = $('#disc-search');
      if (field) { field.focus(); field.setSelectionRange(field.value.length, field.value.length); }
    }
  });

  document.addEventListener('change', (e) => {
    const target = e.target;
    if (target.id === 'lib-sort') {
      state.sort = target.value;
      db.settings.sort = state.sort;
      persist();
      const items = visibleGames();
      const body = $('#lib-body');
      if (body) body.innerHTML = libraryBody(items);
    } else if (target.dataset && target.dataset.setting) {
      db.settings[target.dataset.setting] = target.value;
      if (target.dataset.setting === 'view') state.view = target.value;
      if (target.dataset.setting === 'sort') state.sort = target.value;
      persist();
      render();
    } else if (target.dataset && target.dataset.filter) {
      const key = target.dataset.filter;
      state.filter[key] = target.value;
      render();
      openFilters();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) handleFile(file);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.modalOpen) closeModal();
      else back();
    }
  });

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  function boot() {
    try { history.replaceState({ depth: 1 }, ''); } catch (e) { /* ignore */ }
    renderTabbar();
    Art.all().then((all) => {
      Object.assign(ART, all);
      state.sort = db.settings.sort;
      state.view = db.settings.view;
      render();
    }).catch(() => {
      render();
    });
    render();
  }

  boot();
})();
