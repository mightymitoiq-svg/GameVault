/*
 * GameVault — UI layer
 * Local-first gaming library. Data lives in localStorage, artwork in IndexedDB.
 */
(() => {
  'use strict';

  /* ==================================================================== *
   * Constants
   * ==================================================================== */

  const STORAGE_KEY = 'gamevault.data.v2';
  const LEGACY_KEY = 'gamevault.games.v1';
  const SCHEMA = 2;
  const PAGE = 60;

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
  const ACTIVITY_FILTERS = [['all', 'All'], ['launched', 'Launches'], ['status', 'Status'], ['added', 'Added'], ['artwork', 'Artwork'], ['collection', 'Collections'], ['removed', 'Removed']];
  const SORTS = [
    ['added', 'Recently added'],
    ['title', 'Alphabetical'],
    ['played', 'Recently played'],
    ['launches', 'Most played'],
    ['released', 'Release date'],
  ];
  const ACCENTS = [['violet', 'Electric violet', '#7c5cff'], ['cyan', 'Arctic cyan', '#22d3ee'], ['magenta', 'Neon magenta', '#f472b6']];

  const ICONS = {
    home: '<path d="M3 10.7 12 3.4l9 7.3V20a1.2 1.2 0 0 1-1.2 1.2h-4.6V15H9.8v6.2H4.2A1.2 1.2 0 0 1 3 20z"/>',
    grid: '<rect x="3.2" y="3.2" width="7.2" height="7.2" rx="2"/><rect x="13.6" y="3.2" width="7.2" height="7.2" rx="2"/><rect x="3.2" y="13.6" width="7.2" height="7.2" rx="2"/><rect x="13.6" y="13.6" width="7.2" height="7.2" rx="2"/>',
    list: '<path d="M4 6.5h16M4 12h16M4 17.5h10"/>',
    compact: '<rect x="3.2" y="3.2" width="5.4" height="5.4" rx="1.6"/><rect x="10.3" y="3.2" width="5.4" height="5.4" rx="1.6"/><rect x="17.4" y="3.2" width="3.4" height="5.4" rx="1.6"/><rect x="3.2" y="10.3" width="5.4" height="5.4" rx="1.6"/><rect x="10.3" y="10.3" width="5.4" height="5.4" rx="1.6"/><rect x="17.4" y="10.3" width="3.4" height="5.4" rx="1.6"/><rect x="3.2" y="17.4" width="5.4" height="3.4" rx="1.6"/><rect x="10.3" y="17.4" width="5.4" height="3.4" rx="1.6"/>',
    plus: '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4v4.9l3.1 1.9"/>',
    user: '<circle cx="12" cy="8.1" r="3.9"/><path d="M4.8 20.4c.7-3.6 3.6-5.4 7.2-5.4s6.5 1.8 7.2 5.4"/>',
    search: '<circle cx="11" cy="11" r="6.8"/><path d="m20 20-3.9-3.9"/>',
    filters: '<path d="M4 7.2h16M7 12h10M10 16.8h4"/>',
    back: '<path d="M15 5.2 8.2 12l6.8 6.8"/>',
    chevron: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.9.86-4.3 4.14 1.05 5.85L12 17l-5.25 2.75L7.8 13.9 3.5 9.76l5.9-.86z"/>',
    play: '<path d="M7.6 4.8v14.4L19.4 12z"/>',
    pencil: '<path d="M4.5 19.5h4L20 8a2.1 2.1 0 0 0-3-3L5.5 16.5z"/>',
    image: '<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3"/><circle cx="8.8" cy="9.8" r="1.7"/><path d="m4.6 17.8 4.9-3.9 3.4 2.7 2.9-2.2 3.8 3.4"/>',
    trash: '<path d="M4 7h16M9.6 7V4.6h4.8V7M6.6 7l.9 13h9l.9-13"/>',
    folder: '<path d="M3.2 7.6A2.4 2.4 0 0 1 5.6 5.2h3.3l1.9 2h7.6a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4z"/>',
    download: '<path d="M12 4.2v10m0 0 3.9-3.9M12 14.2 8.1 10.3M4.8 19.4h14.4"/>',
    upload: '<path d="M12 19.8v-10m0 0 3.9 3.9M12 9.8 8.1 13.7M4.8 4.6h14.4"/>',
    check: '<path d="m5 12.4 4.6 4.6L19 7.4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrowUp: '<path d="M12 19V5m0 0-5.6 5.6M12 5l5.6 5.6"/>',
    arrowDown: '<path d="M12 5v14m0 0 5.6-5.6M12 19l-5.6-5.6"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3.4v2.2M12 18.4v2.2M4.9 7.9l1.9 1.1M17.2 15l1.9 1.1M4.9 16.1l1.9-1.1M17.2 9l1.9-1.1"/>',
    sparkle: '<path d="M12 3.6l1.9 4.9 4.9 1.9-4.9 1.9L12 17.2l-1.9-4.9L5.2 10.4l4.9-1.9z"/>',
    cloud: '<path d="M7.4 18.4h9.2a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.3 1.2 3.2 3.2 0 0 0 .7 6.4z"/>',
  };

  const icon = (name, extra) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' +
    (ICONS[name] || '') + '</svg>';

  /* ==================================================================== *
   * Utilities
   * ==================================================================== */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () =>
    (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const clampInt = (value, min, max) => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n));
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
    const now = new Date();
    if (dayKey(ts) === dayKey(now.getTime())) return 'Today';
    if (dayKey(ts) === dayKey(now.getTime() - 864e5)) return 'Yesterday';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'long', day: 'numeric',
      year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
  };

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const fmtDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  async function fetchWithTimeout(url, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  const relTime = (ts) => {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    if (diff < 6e4) return 'Just now';
    if (diff < 36e5) return Math.round(diff / 6e4) + 'm ago';
    if (diff < 864e5) return Math.round(diff / 36e5) + 'h ago';
    if (diff < 6048e5) return Math.round(diff / 864e5) + 'd ago';
    return fmtDate(ts);
  };

  /* ==================================================================== *
   * Artwork store
   * ==================================================================== */

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
        const request = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request && 'result' in request ? request.result : undefined);
        tx.onerror = () => reject(tx.error || new Error('tx failed'));
        tx.onabort = () => reject(tx.error || new Error('tx aborted'));
      }));
    }

    return {
      async put(dataUrl, thumb) {
        const key = 'art_' + uid();
        memory.set(key, dataUrl);
        try {
          await run('readwrite', (s) => {
            s.put(dataUrl, key);
            if (thumb) s.put(thumb, 'thumb:' + key);
          });
        } catch (e) { /* memory fallback */ }
        return key;
      },
      async get(key) {
        if (!key) return null;
        const stored = memory.get(key);
        if (stored) return stored;
        try {
          const value = await run('readonly', (s) => s.get(key));
          return value || null;
        } catch (e) { return null; }
      },
      async getMany(keys) {
        const out = {};
        const wanted = [...new Set((keys || []).filter(Boolean))];
        if (!wanted.length) return out;
        wanted.forEach((key) => { if (memory.has(key)) out[key] = memory.get(key); });
        const missing = wanted.filter((key) => !out[key]);
        if (!missing.length) return out;
        try {
          const values = await Promise.all(missing.map((key) => run('readonly', (s) => s.get(key))));
          missing.forEach((key, i) => { if (values[i]) out[key] = values[i]; });
        } catch (e) { /* ignore */ }
        return out;
      },
      async keys() {
        try {
          const stored = await run('readonly', (s) => s.getAllKeys());
          return stored.concat([...memory.keys()].filter((key) => !stored.includes(key)));
        } catch (e) { return [...memory.keys()]; }
      },
      async all() {
        const out = {};
        try {
          const keys = await run('readonly', (s) => s.getAllKeys());
          const values = await run('readonly', (s) => s.getAll());
          keys.forEach((k, i) => { out[k] = values[i]; });
        } catch (e) { /* ignore */ }
        return Object.assign(out, Object.fromEntries(memory));
      },
      async clear() {
        memory.clear();
        try { await run('readwrite', (s) => s.clear()); } catch (e) { /* ignore */ }
      },
    };
  })();

  /* ==================================================================== *
   * Data
   * ==================================================================== */

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

  const ART = {};

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
      ? raw.platforms.map((p) => (typeof p === 'string'
        ? { name: mapPlatform(p), appId: null }
        : { name: mapPlatform(p.name), appId: p.appId || null }))
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

  function loadDb() {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { parsed = null; }
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
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch (e) { legacy = []; }
    if (Array.isArray(legacy) && legacy.length) {
      db.games = legacy.map((g) => normalizeGame({
        id: g.id,
        title: g.title,
        genres: g.genre ? [g.genre] : [],
        platforms: g.platform ? [{ name: mapPlatform(g.platform), appId: null }] : [],
        status: g.status || 'backlog',
        rating: g.rating || 0,
        notes: g.notes || '',
        addedAt: g.addedAt || Date.now(),
      })).filter(Boolean);
      db.activity = db.games.map((g) => makeEvent('added', g.title, g.id, g.addedAt));
    }
    return db;
  }

  let db = loadDb();
  let artCount = null;
  let storageUsed = '';

  const ownedGames = () => db.games.filter((g) => !g.wishlist);
  const artCountLabel = () => (artCount == null ? '…' : artCount);

  async function refreshArtCount() {
    try {
      const keys = await Art.keys();
      artCount = keys.filter((key) => String(key).indexOf('thumb:') !== 0).length;
    } catch (e) { artCount = null; }
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate && estimate.usage) {
          const mb = estimate.usage / 1048576;
          storageUsed = mb >= 1 ? mb.toFixed(1) + ' MB' : Math.max(1, Math.round(estimate.usage / 1024)) + ' KB';
        }
      } catch (e) { /* ignore */ }
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      toast('Storage is full. Export a backup and remove some artwork.', true);
      return false;
    }
  }

  function makeEvent(type, title, gameId, at, extra) {
    return { id: uid(), type, title, gameId: gameId || null, at: at || Date.now(), extra: extra || '' };
  }

  function logEvent(type, title, gameId, extra) {
    if (!db.settings.trackActivity) return;
    db.activity.unshift(makeEvent(type, title, gameId, Date.now(), extra));
    if (db.activity.length > 800) db.activity.length = 800;
  }

  const gameById = (id) => db.games.find((g) => g.id === id) || null;
  const collectionById = (id) => db.collections.find((c) => c.id === id) || null;

  const AUTO_COLLECTIONS = [
    { id: 'auto-all', name: 'All games', icon: 'grid', match: () => true },
    { id: 'auto-favorites', name: 'Favorites', icon: 'star', match: (g) => g.favorite },
    { id: 'auto-recent', name: 'Recently added', icon: 'sparkle', match: (g) => Date.now() - g.addedAt < 14 * 864e5 },
    { id: 'auto-backlog', name: 'Backlog', icon: 'folder', match: (g) => g.status === 'backlog' },
    { id: 'auto-playing', name: 'Playing', icon: 'play', match: (g) => g.status === 'playing' },
    { id: 'auto-completed', name: 'Completed', icon: 'check', match: (g) => g.status === 'completed' },
  ];

  function collectionGames(id) {
    if (id.startsWith('auto-')) {
      const auto = AUTO_COLLECTIONS.find((a) => a.id === id);
      return auto ? db.games.filter(auto.match) : [];
    }
    const collection = collectionById(id);
    return collection ? collection.gameIds.map(gameById).filter(Boolean) : [];
  }

  function collectionName(id) {
    if (id.startsWith('auto-')) {
      const auto = AUTO_COLLECTIONS.find((a) => a.id === id);
      return auto ? auto.name : 'Collection';
    }
    const collection = collectionById(id);
    return collection ? collection.name : 'Collection';
  }

  /* ==================================================================== *
   * Android host
   * ==================================================================== */

  const host = window.AndroidHost || null;
  const installedCache = new Set();

  function installedApp(pkg) {
    if (!pkg) return false;
    if (installedCache.has(pkg)) return true;
    if (!host) return false;
    try {
      const found = !!host.isInstalled(pkg);
      if (found) installedCache.add(pkg);
      return found;
    } catch (e) { return false; }
  }

  function gameInstalled(game) {
    return (game.platforms || []).some((p) => p.appId && installedApp(p.appId));
  }

  function haptic(ms) {
    if (!db.settings.haptics) return;
    try {
      if (navigator.vibrate) navigator.vibrate(ms || 12);
      else if (host && host.vibrate) host.vibrate(ms || 12);
    } catch (e) { /* ignore */ }
  }

  /* ==================================================================== *
   * View state
   * ==================================================================== */

  const state = {
    stack: [{ screen: 'home', params: {} }],
    activeTab: 'home',
    query: '',
    sort: db.settings.sort,
    view: db.settings.view,
    limit: PAGE,
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
    settingsSection: null,
    modalOpen: false,
    pendingArt: null,
    formPlatforms: [],
    pendingRestore: null,
    lastFocus: null,
    activityLimit: 50,
    activityFilter: 'all',
  };

  const TAB_OF = { home: 'home', library: 'library', add: 'add', activity: 'activity', profile: 'profile' };

  function current() {
    return state.stack[state.stack.length - 1];
  }

  function go(screen, params) {
    current().scrollY = window.scrollY;
    state.reorder = false;
    state.stack.push({ screen, params: params || {}, scrollY: 0 });
    state.activeTab = TAB_OF[screen] || state.activeTab;
    render();
    window.scrollTo(0, 0);
  }

  function tabTo(name) {
    closeModal();
    state.reorder = false;
    if (name === 'activity') { state.activityLimit = 50; state.activityFilter = 'all'; }
    if (state.activeTab === name && state.stack.length === 1) {
      window.scrollTo(0, 0);
      return;
    }
    state.stack = [{ screen: name, params: {} }];
    state.activeTab = name;
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    if (state.modalOpen) { closeModal(); return; }
    if (state.stack.length > 1) {
      state.stack.pop();
      state.reorder = false;
      state.activeTab = TAB_OF[current().screen] || state.activeTab;
      render();
      const y = current().scrollY || 0;
      window.scrollTo(0, y);
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }

  window.__gvBack = () => {
    if (state.modalOpen) { closeModal(); return true; }
    if (state.stack.length > 1) { back(); return true; }
    return false;
  };

  /* ==================================================================== *
   * Components
   * ==================================================================== */

    const artSource = (record, kind) => {
    if (!record) return { key: null, url: '' };
    const background = kind === 'background';
    return {
      key: (background ? record.backgroundKey : record.coverKey) || null,
      url: (background ? record.backgroundUrl : record.coverUrl) || '',
    };
  };

  const hasArt = (record, kind) => {
    const source = artSource(record, kind);
    return !!(source.key || source.url);
  };

  function artTag(record, kind, attrs, useThumb) {
    const source = artSource(record, kind);
    if (source.key) {
      if (ART[source.key]) return '<img src="' + esc(ART[source.key]) + '" ' + attrs + '>';
      const thumb = useThumb === false ? '' : ' data-thumb="1"';
      return '<img data-art="' + esc(source.key) + '"' + thumb + ' ' + attrs + '>';
    }
    return source.url ? '<img src="' + esc(source.url) + '" ' + attrs + '>' : '';
  }

  function heroTag(record, attrs) {
    if (hasArt(record, 'background')) return artTag(record, 'background', attrs, false);
    if (hasArt(record, 'cover')) return artTag(record, 'cover', attrs, false);
    return '';
  }

  async function hydrateArt(root) {
    const nodes = $$('img[data-art]', root || document).filter((img) => !img.dataset.artDone);
    if (!nodes.length) return;
    nodes.forEach((img) => { img.dataset.artDone = '1'; });
    const wanted = [];
    nodes.forEach((img) => {
      wanted.push(img.dataset.art);
      if (img.dataset.thumb === '1') wanted.push('thumb:' + img.dataset.art);
    });
    const values = await Art.getMany(wanted);
    nodes.forEach((img) => {
      const key = img.dataset.art;
      const preferThumb = img.dataset.thumb === '1';
      const src = (preferThumb && values['thumb:' + key]) || values[key];
      if (src) img.src = src;
      else { img.dataset.failed = '1'; img.style.display = 'none'; }
    });
  }

  function artMarkup(record, opts) {
    const o = opts || {};
    const artAttrs = 'alt="" width="300" height="400" loading="lazy" decoding="async"';
    return '<span class="art' + (o.className ? ' ' + o.className : '') + '" style="--hue:' + hueOf(record.title) + '">' +
      '<span class="art-initials">' + esc(initials(record.title)) + '</span>' +
      artTag(record, o.background ? 'background' : 'cover', artAttrs) +
      (o.favorite ? '<span class="art-badge">' + icon('star') + '</span>' : '') +
      (o.status ? '<span class="art-status ' + esc(record.status) + '"><span class="dot"></span>' +
        esc(STATUS_LABEL[record.status]) + '</span>' : '') +
      '</span>';
  }

  const platformNames = (game) =>
    [...new Set((game.platforms || []).map((p) => p.name))].slice(0, 2).join(' · ');

  function poster(game) {
    return '<button class="poster" data-act="open-game" data-id="' + esc(game.id) + '" ' +
      'aria-label="' + esc(game.title) + '">' +
      artMarkup(game, { favorite: game.favorite }) +
      '<span class="poster-title">' + esc(game.title) + '</span>' +
      '<span class="poster-meta">' + esc(platformNames(game) || STATUS_LABEL[game.status]) + '</span>' +
      '</button>';
  }

  function card(game) {
    return '<button class="card" data-act="open-game" data-id="' + esc(game.id) + '" ' +
      'aria-label="' + esc(game.title) + ', ' + esc(STATUS_LABEL[game.status]) + '">' +
      artMarkup(game, { favorite: game.favorite, status: true }) +
      '<span class="poster-title">' + esc(game.title) + '</span>' +
      '<span class="poster-meta">' + esc(platformNames(game) || 'No platform') + '</span>' +
      '</button>';
  }

  function row(game, trailing) {
    return '<button class="row" data-act="open-game" data-id="' + esc(game.id) + '">' +
      artMarkup(game, { className: 'row-art' }) +
      '<span class="row-main">' +
      '<span class="row-title">' + esc(game.title) + '</span>' +
      '<span class="row-meta">' + esc([platformNames(game), game.genres && game.genres[0]].filter(Boolean).join(' · ') || 'No details') + '</span>' +
      '<span class="row-tags"><span class="tag status ' + esc(game.status) + '">' + esc(STATUS_LABEL[game.status]) + '</span>' +
      (game.favorite ? '<span class="tag">★ Favorite</span>' : '') + '</span>' +
      '</span>' +
      '<span class="row-end">' + (trailing ? '<span class="tag">' + esc(trailing) + '</span>' : '') + icon('chevron') + '</span>' +
      '</button>';
  }

  function empty(title, body, actionLabel, action, iconName) {
    return '<div class="empty">' +
      '<span class="empty-icon">' + icon(iconName || 'sparkle') + '</span>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' +
      (actionLabel && action ? '<button class="btn primary" data-act="' + esc(action) + '">' + esc(actionLabel) + '</button>' : '') +
      '</div>';
  }

  const sectionHead = (title, linkLabel, action) =>
    '<div class="section-head"><h2>' + esc(title) + '</h2>' +
    (linkLabel ? '<button class="section-link" data-act="' + esc(action) + '">' + esc(linkLabel) + '</button>' : '') +
    '</div>';

  const appbar = (title, sub, actions, leading) =>
    '<header class="appbar">' +
    (leading || '') +
    '<div class="appbar-main"><h1>' + esc(title) + '</h1>' +
    (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div>' +
    (actions || '') +
    '</header>';

  const backBtn = () => '<button class="iconbtn plain" data-act="back" aria-label="Back">' + icon('back') + '</button>';

  const statStrip = (items) =>
    '<div class="statstrip">' + items.map(([label, value]) =>
      '<div class="stat"><span class="stat-value">' + esc(value) + '</span>' +
      '<span class="stat-label">' + esc(label) + '</span></div>').join('') + '</div>';

  const tag = (text, cls) => '<span class="tag' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</span>';

  function skeletonGrid(count) {
    return '<div class="grid" aria-busy="true" role="status"><span class="sr-only">Loading…</span>' +
      Array.from({ length: count }).map(() =>
        '<div><div class="sk" style="aspect-ratio:3/4"></div>' +
        '<div class="sk line" style="width:80%;margin-top:8px"></div></div>').join('') + '</div>';
  }

  function skeletonRows(count) {
    return '<div class="list" aria-busy="true" role="status"><span class="sr-only">Loading…</span>' +
      Array.from({ length: count }).map(() => '<div class="sk row"></div>').join('') + '</div>';
  }

  const appIconCache = new Map();

  function hydrateAppIcons(root) {
    const nodes = $$('img[data-icon-pkg]', root || document).filter((img) => !img.dataset.iconDone);
    if (!nodes.length) return;
    nodes.forEach((img) => { img.dataset.iconDone = '1'; });
    nodes.forEach((img, index) => {
      setTimeout(() => {
        if (!img.isConnected || !host) return;
        const pkg = img.dataset.iconPkg;
        let url = appIconCache.get(pkg) || '';
        if (!url && host.getAppIcon) {
          try { url = host.getAppIcon(pkg) || ''; } catch (e) { url = ''; }
          if (url) appIconCache.set(pkg, url);
        }
        if (url) img.src = url;
      }, Math.min(800, index * 6));
    });
  }

  function hydrateImages(root) {
    $$('img', root || document).forEach((img) => {
      if (img.dataset.hydrated) return;
      img.dataset.hydrated = '1';
      const done = () => img.classList.add('loaded');
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener('load', done, { once: true });
    });
  }

  /* ==================================================================== *
   * Screens
   * ==================================================================== */

  function screenHome() {
    const games = ownedGames();
    const launches = games.reduce((n, g) => n + g.launchCount, 0);
    const completed = games.filter((g) => g.status === 'completed').length;
    const playing = games.filter((g) => g.status === 'playing');
    const featured = games.slice().sort((a, b) =>
      (b.favorite - a.favorite) ||
      ((b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)) ||
      ((b.launchCount || 0) - (a.launchCount || 0)) ||
      (b.addedAt - a.addedAt))[0];
    const recent = games.slice().sort((a, b) => b.addedAt - a.addedAt).slice(0, 10);
    const mostPlayed = games.filter((g) => g.launchCount > 0)
      .sort((a, b) => b.launchCount - a.launchCount).slice(0, 3);
    const favCollections = db.collections.filter((c) => c.favorite).slice(0, 4);
    const favoriteGames = games.filter((g) => g.favorite).slice(0, 10);
    const name = db.profile.username || 'Player One';
    const avatarKey = db.profile.avatarKey;

    let html = '<div class="screen"><div class="intro">' +
      '<div class="intro-top"><div>' +
      '<p class="overline" translate="no" style="margin:0">GameVault</p>' +
      '<h1 class="display">Welcome back, ' + esc(name) + '</h1>' +
      '</div><button class="avatar" data-act="tab-profile" aria-label="Open profile">' +
      (avatarKey ? artTag({ coverKey: avatarKey }, 'cover', 'alt="" width="96" height="96" decoding="async"') : esc(initials(name))) + '</button></div>' +
      statStrip([
        ['Games', games.length],
        ['Playing', playing.length],
        ['Done', completed],
        ['Launches', launches],
      ]) +
      '</div><div class="wrap" style="margin-top:' + (games.length ? '20px' : '4px') + '">';

    if (!games.length) {
      html += empty('Your vault is empty', 'Add games from your device, import them from the online catalogue, or create an entry by hand.', 'Add your first game', 'tab-add', 'plus') +
        '<div class="tiles" style="margin-top:16px">' +
        '<button class="tile accent" data-act="tab-add">' + icon('plus') + '<span><span class="tile-label">Add games</span></span></button>' +
        '<button class="tile" data-act="open-collections">' + icon('folder') + '<span><span class="tile-label">Collections</span></span></button>' +
        '</div></div></div>';
      return html;
    }

    if (featured) {
      const featureArt = heroTag(featured, 'class="feature-art" alt="" width="1200" height="825" fetchpriority="high" decoding="async"');
      html += '<button class="feature" style="--hue:' + hueOf(featured.title) + '" data-act="open-game" data-id="' + esc(featured.id) + '">' +
        (featureArt || '<span class="feature-mark" aria-hidden="true">' + esc(initials(featured.title)) + '</span>') +
        '<span class="feature-scrim"></span>' +
        '<span class="feature-body">' +
        tag(featured.status === 'playing' ? 'Continue playing' : 'Featured game') +
        '<span class="feature-title">' + esc(featured.title) + '</span>' +
        '<span class="feature-meta">' + esc([platformNames(featured), featured.genres && featured.genres[0]].filter(Boolean).join(' · ') || 'In your library') + '</span>' +
        '<span class="feature-cta">' + icon('play') + 'Open game</span>' +
        '</span></button>';
    }

    if (playing.length) {
      html += '<section class="section">' + sectionHead('Continue playing', 'Library', 'tab-library') +
        '<div class="rail">' + playing
          .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
          .slice(0, 8).map((g) => poster(g)).join('') + '</div></section>';
    }

    if (favoriteGames.length) {
      html += '<section class="section">' + sectionHead('Favorites') +
        '<div class="rail">' + favoriteGames.map((g) => poster(g)).join('') + '</div></section>';
    }

    if (recent.length) {
      html += '<section class="section">' + sectionHead('Recently added', 'See all', 'tab-library') +
        '<div class="rail">' + recent.slice(0, 8).map((g) => poster(g)).join('') + '</div></section>';
    }

    if (mostPlayed.length) {
      html += '<section class="section">' + sectionHead('Most played') +
        '<div class="list">' + mostPlayed.map((g) =>
          row(g, g.launchCount === 1 ? '1 launch' : g.launchCount + ' launches')).join('') + '</div></section>';
    }

    if (favCollections.length) {
      html += '<section class="section">' + sectionHead('Favorite collections', 'All', 'open-collections') +
        '<div class="rail" style="gap:12px">' + favCollections.map((c) => {
          const first = c.gameIds.map(gameById).filter(Boolean)[0];
          const img = c.artworkKey
            ? artTag({ coverKey: c.artworkKey }, 'cover', 'alt="" width="800" height="450" loading="lazy" decoding="async"')
            : (first ? heroTag(first, 'alt="" width="800" height="450" loading="lazy" decoding="async"') : '');
          return '<button class="shelf" style="flex:0 0 260px;width:260px" data-act="open-collection" data-id="' + esc(c.id) + '">' +
            img +
            (c.favorite ? '<span class="shelf-fav">' + icon('star') + '</span>' : '') +
            '<span class="shelf-body"><span class="shelf-title">' + esc(c.name) + '</span>' +
            '<span class="shelf-meta">' + c.gameIds.length + ' games</span></span></button>';
        }).join('') + '</div></section>';
    }

    const wishlist = db.games.filter((g) => g.wishlist);
    if (wishlist.length) {
      html += '<section class="section"><div class="tiles">' +
        '<button class="tile" data-act="tab-library">' + icon('star') +
        '<span><span class="tile-label">Wishlist</span><span class="tile-sub">' +
        wishlist.length + (wishlist.length === 1 ? ' game' : ' games') + ' to pick up</span></span></button>' +
        '</div></section>';
    }

    return html + '</div></div>';
  }

  function screenLibrary() {
    const items = visibleGames();
    return '<div class="screen">' +
      '<div class="lib-head">' +
      appbar('Library', db.games.length + (db.games.length === 1 ? ' game' : ' games'),
        '<button class="iconbtn solid" data-act="tab-add" aria-label="Add game">' + icon('plus') + '</button>') +
      '<div class="lib-bar"><div class="lib-search">' +
      '<label class="searchbar">' + icon('search') +
      '<input id="lib-search" type="search" placeholder="Search games…" value="' + esc(state.query) + '" aria-label="Search library" autocomplete="off"></label>' +
      '<button class="iconbtn" data-act="open-filters" aria-label="Filters and sorting">' + icon('filters') + '</button>' +
      '</div><div class="lib-tools">' +
      '<div class="chips" style="flex:1">' + statusChips() + '</div>' +
      '</div><div id="lib-filters">' + activeFilterRow() + '</div></div></div>' +
      '<div class="wrap"><div class="count-line"><span id="lib-count" aria-live="polite">' + resultLabel(items.length) + '</span>' +
      '<span style="display:flex;align-items:center;gap:10px">' +
      '<span>' + esc(SORTS.find((s) => s[0] === state.sort)[1]) + '</span>' +
      '<span class="viewswitch" role="group" aria-label="Display mode">' +
      VIEWS.map(([id, label]) =>
        '<button data-act="set-view" data-view="' + id + '" aria-pressed="' + (state.view === id) + '" aria-label="' + label + ' view">' +
        icon(id) + '</button>').join('') +
      '</span></span></div>' +
      '<div id="lib-body">' + libraryBody(items) + '</div></div></div>';
  }

  const resultLabel = (n) => n + (n === 1 ? ' game' : ' games');

  function statusChips() {
    return [['all', 'All']].concat(STATUSES).map(([id, label]) =>
      '<button class="chip" data-act="filter-status" data-status="' + id + '" aria-pressed="' +
      (state.filter.status === id) + '">' + esc(label) + '</button>').join('');
  }

  const FILTER_LABELS = {
    platform: (value) => value,
    genre: (value) => value,
    installed: (value) => (value === 'yes' ? 'Installed' : 'Not installed'),
    completion: (value) => (value === 'completed' ? 'Completed only' : 'Not completed'),
  };

  function activeFilterList() {
    const f = state.filter;
    return ['platform', 'genre', 'installed', 'completion']
      .filter((key) => f[key] !== 'all')
      .map((key) => ({ key, label: FILTER_LABELS[key](f[key]) }));
  }

  function activeFilterRow() {
    const active = activeFilterList();
    if (!active.length) return '';
    return '<div class="chips active-filters">' + active.map((f) =>
      '<button class="chip" data-act="clear-filter" data-key="' + f.key + '">' + esc(f.label) +
      '<span aria-hidden="true">✕</span><span class="sr-only"> filter active, clear it</span></button>').join('') +
      '<button class="chip" data-act="clear-filters">Clear all</button></div>';
  }

  function libraryBody(items) {
    if (!db.games.length) {
      return empty('Nothing here yet', 'Your collection starts with one game. Browse your device or add one manually.', 'Add a game', 'tab-add', 'plus');
    }
    if (!items.length) {
      return empty('No matches', 'Nothing matches this search and filter combination.', 'Clear filters', 'clear-filters', 'search');
    }
    const shown = items.slice(0, state.limit);
    let html;
    if (state.view === 'list') {
      html = '<div class="list">' + shown.map((g) => row(g, g.launchCount ? g.launchCount + ' ×' : '')).join('') + '</div>';
    } else {
      html = '<div class="grid' + (state.view === 'compact' ? ' compact' : '') + '">' +
        shown.map((g) => card(g)).join('') + '</div>';
    }
    if (items.length > shown.length) {
      html += '<div id="lib-more" class="count-line" style="justify-content:center">Loading more…</div>';
    }
    return html;
  }

  function refreshLibrary(resetLimit) {
    if (resetLimit) state.limit = PAGE;
    const items = visibleGames();
    const body = $('#lib-body');
    if (body) {
      body.innerHTML = libraryBody(items);
      hydrateImages(body);
    }
    const filters = $('#lib-filters');
    if (filters) filters.innerHTML = activeFilterRow();
    const count = $('#lib-count');
    if (count) count.textContent = resultLabel(items.length);
    observeLibrary(items.length);
  }

  let libObserver = null;
  function observeLibrary(total) {
    if (libObserver) { libObserver.disconnect(); libObserver = null; }
    const sentinel = $('#lib-more');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    libObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        state.limit += PAGE;
        refreshLibrary(false);
      }
    }, { rootMargin: '500px' });
    libObserver.observe(sentinel);
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
      if (f.installed === 'yes' && !gameInstalled(g)) return false;
      if (f.installed === 'no' && gameInstalled(g)) return false;
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
    let body;
    if (state.addTab === 'discover') body = addDiscover();
    else if (state.addTab === 'catalogue') body = addCatalogue();
    else body = addManual();

    return '<div class="screen">' +
      appbar('Add games', 'Three ways to grow your library') +
      '<div class="wrap">' +
      '<div class="seg">' + tabs.map(([id, label]) =>
        '<button data-act="add-tab" data-tab="' + id + '" aria-pressed="' + (state.addTab === id) + '">' +
        esc(label) + '</button>').join('') + '</div>' +
      '<div style="margin-top:16px">' + body + '</div></div></div>';
  }

  function addDiscover() {
    if (!host) {
      return '<div class="notice">' + icon('image') + '<div><strong>Device discovery runs in the Android app</strong>' +
        'When GameVault runs on a phone it can list launchable games. Manual entry works everywhere.</div></div>' +
        '<button class="btn block" style="margin-top:12px" data-act="add-tab" data-tab="manual">Create manually</button>';
    }
    let html = '<div class="notice">' + icon('check') + '<div><strong>Scan this device</strong>' +
      'Launchable apps are listed so you can add them. Anything misdetected can be edited afterwards.</div></div>';

    html += '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="btn primary" style="flex:1" data-act="discover-scan">' + icon('search') +
      (state.discovery ? 'Rescan' : 'Scan device') + '</button>' +
      (state.selected.size ? '<button class="btn soft" data-act="discover-add">Add ' + state.selected.size + '</button>' : '') +
      '</div>';

    if (state.discoveryBusy) return html + '<div style="margin-top:12px">' + skeletonRows(6) + '</div>';
    if (!state.discovery) return html;

    const q = state.discoveryQuery.trim().toLowerCase();
    const apps = state.discovery.filter((a) => !q || a.label.toLowerCase().includes(q));
    html += '<label class="searchbar" style="margin-top:12px">' + icon('search') +
      '<input id="disc-search" type="search" placeholder="Search installed apps…" aria-label="Search installed apps" autocomplete="off" value="' + esc(state.discoveryQuery) + '"></label>';

    if (!apps.length) {
      return html + '<div style="margin-top:12px">' + empty('No apps found', 'Try another search term.', '', '', 'search') + '</div>';
    }

    html += '<div class="list" style="margin-top:12px">' + apps.map((app) => {
      const existing = gameForPackage(app.packageName);
      const selected = state.selected.has(app.packageName);
      return '<button class="discover' + (existing ? ' in-library' : '') + '" ' +
        'data-act="discover-toggle" data-pkg="' + esc(app.packageName) + '" ' +
        'aria-pressed="' + (selected || !!existing) + '"' + (existing ? ' disabled' : '') + '>' +
        '<img class="app-icon" data-icon-pkg="' + esc(app.packageName) + '" alt="" width="88" height="88" loading="lazy" decoding="async">' +
        '<span class="discover-main"><span class="discover-title">' + esc(app.label) + '</span>' +
        '<span class="discover-sub">' + esc(existing ? 'Already in library' : app.packageName) + '</span></span>' +
        '<span class="tick">' + icon('check') + '</span></button>';
    }).join('') + '</div>';

    return html;
  }

  const gameForPackage = (pkg) =>
    db.games.find((g) => (g.platforms || []).some((p) => p.appId === pkg)) || null;

  function addCatalogue() {
    const key = (db.settings.catalogueKey || '').trim();
    let html = '<div class="notice">' + icon('cloud') + '<div><strong>Online catalogue</strong>' +
      'Imports title, artwork, description, release date, genres and companies. A free RAWG API key is required.</div></div>';

    if (!key) {
      html += '<form id="form-catalogue-key" class="panel" style="margin-top:12px">' +
        '<div class="panel-head"><h2 class="panel-title">Catalogue access</h2></div>' +
        '<label class="field"><span class="label">RAWG API key</span>' +
        '<input name="key" placeholder="Paste your api.rawg.io key" autocomplete="off"></label>' +
        '<button class="btn primary block" type="submit" style="margin-top:12px">Save key</button>' +
        '<p class="sheet-note">Stored only on this device and sent only to api.rawg.io. Without a key, manual entry and your library keep working offline.</p>' +
        '</form>';
    } else {
      html += '<form id="form-catalogue" class="lib-search" style="margin-top:12px">' +
        '<label class="searchbar">' + icon('search') +
        '<input name="q" type="search" placeholder="Search the catalogue…" aria-label="Search the catalogue" autocomplete="off" value="' + esc(state.catalogueQuery) + '"></label>' +
        '<button class="iconbtn solid" type="submit" aria-label="Search catalogue">' + icon('search') + '</button></form>';
    }

    if (state.catalogueBusy) return html + '<div style="margin-top:14px">' + skeletonRows(5) + '</div>';

    if (state.catalogueError) {
      return html + '<div class="notice error" style="margin-top:14px">' + icon('close') + '<div><strong>Catalogue unavailable</strong>' +
        esc(state.catalogueError) + ' Check your connection, or add the game by hand.</div></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button class="btn primary" style="flex:1" data-act="catalogue-retry">' + icon('search') + 'Try again</button>' +
        '<button class="btn" style="flex:1" data-act="add-tab" data-tab="manual">Add manually</button></div>';
    }

    if (!state.catalogue) {
      return html + '<div style="margin-top:14px">' + empty('Search the catalogue', 'Results include artwork you can keep offline and metadata you can edit afterwards.', '', '', 'search') + '</div>';
    }

    if (!state.catalogue.length) {
      return html + '<div style="margin-top:14px">' + empty('No results', 'Nothing matched that title. Try a shorter search or create the entry yourself.', 'Create manually', 'add-tab', 'search') + '</div>';
    }

    html += '<div class="list" style="margin-top:14px">' + state.catalogue.map((item, index) => {
      const existing = db.games.find((g) => g.title.toLowerCase() === item.title.toLowerCase());
      return '<div class="result">' +
        '<span class="art" style="--hue:' + hueOf(item.title) + ';width:54px">' +
        (item.image ? '<img src="' + esc(item.image) + '" alt="" width="300" height="400" loading="lazy" decoding="async">' : '<span>' + esc(initials(item.title)) + '</span>') +
        '</span><span class="row-main"><span class="row-title">' + esc(item.title) + '</span>' +
        '<span class="row-meta">' + esc([item.released ? item.released.slice(0, 4) : '', (item.platforms || []).slice(0, 2).join(', ')].filter(Boolean).join(' · ')) + '</span></span>' +
        '<button class="btn sm' + (existing ? '' : ' soft') + '" data-act="catalogue-add" data-index="' + index + '">' +
        (existing ? 'Merge' : 'Add') + '</button></div>';
    }).join('') + '</div>';

    return html;
  }

  function addManual() {
    return '<form id="form-game" class="panel">' +
      '<div class="panel-head"><h2 class="panel-title">Manual entry</h2></div>' +
      gameFields({ title: '', franchise: '', genres: [], platforms: [], status: 'backlog', rating: 0, notes: '', description: '', developer: '', publisher: '', releaseDate: '' }) +
      '<button class="btn primary block" type="submit" style="margin-top:16px">Add to library</button></form>';
  }

  function formArtPreview(values) {
    const key = state.formArtwork || (values && values.coverKey) || null;
    const remote = values && values.coverUrl ? values.coverUrl : '';
    const markup = artTag({ coverKey: key, coverUrl: remote }, 'cover', 'alt="" width="84" height="112" decoding="async"');
    return markup || '<span class="form-art-empty">No artwork</span>';
  }

  function gameFields(values) {
    state.formPlatforms = (values.platforms || []).map((p) => (typeof p === 'string' ? p : p.name));
    const genreText = Array.isArray(values.genres) ? values.genres.join(', ') : '';
    return '<label class="field"><span class="label">Title</span>' +
              '<input name="title" required maxlength="120" autocomplete="off" value="' + esc(values.title) + '" placeholder="Game title"></label>' +
      '<label class="field"><span class="label">Franchise</span>' +
      '<input name="franchise" maxlength="60" autocomplete="off" value="' + esc(values.franchise) + '" placeholder="Optional"></label>' +
      '<div class="field"><span class="label">Platforms</span><div class="chips wrap">' +
      PLATFORMS.map((p) => '<button type="button" class="chip" data-act="form-platform" data-platform="' + esc(p) + '" aria-pressed="' +
        state.formPlatforms.includes(p) + '">' + esc(p) + '</button>').join('') + '</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<label class="field"><span class="label">Status</span><select name="status">' +
      STATUSES.map(([id, label]) => '<option value="' + id + '"' + (values.status === id ? ' selected' : '') + '>' + label + '</option>').join('') +
      '</select></label>' +
      '<label class="field"><span class="label">Rating</span><select name="rating">' +
      [0, 1, 2, 3, 4, 5].map((n) => '<option value="' + n + '"' + (values.rating === n ? ' selected' : '') + '>' + (n ? n + ' / 5' : 'Unrated') + '</option>').join('') +
      '</select></label></div>' +
      '<label class="field"><span class="label">Genres</span>' +
      '<input name="genres" maxlength="120" autocomplete="off" value="' + esc(genreText) + '" placeholder="Action, RPG"></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<label class="field"><span class="label">Developer</span><input name="developer" maxlength="80" autocomplete="off" value="' + esc(values.developer) + '"></label>' +
      '<label class="field"><span class="label">Publisher</span><input name="publisher" maxlength="80" autocomplete="off" value="' + esc(values.publisher) + '"></label></div>' +
      '<label class="field"><span class="label">Release date</span><input name="releaseDate" type="date" value="' + esc(values.releaseDate) + '"></label>' +
      '<div class="field"><span class="label">Cover artwork</span>' +
      '<div id="form-art-preview" class="form-art">' + formArtPreview(values) + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button type="button" class="btn sm" style="flex:1" data-act="change-art" data-target="cover">' + icon('image') +
      (formArtPreview(values) ? 'Replace' : 'Choose image') + '</button>' +
      '<button type="button" class="btn sm ghost" style="flex:1" data-act="form-art-clear"' + (state.formArtwork ? '' : ' hidden') + '>Remove</button>' +
      '</div></div>' +
      '<label class="field"><span class="label">Description</span>' +
      '<textarea name="description" maxlength="2000" rows="3" autocomplete="off">' + esc(values.description) + '</textarea></label>' +
      '<label class="field"><span class="label">Personal notes</span>' +
      '<textarea name="notes" maxlength="2000" rows="3" autocomplete="off">' + esc(values.notes) + '</textarea></label>';
  }

  function screenGame(params) {
    const game = gameById(params.id);
    if (!game) {
      return '<div class="screen">' + appbar('Not found', '', '', backBtn()) +
        '<div class="wrap">' + empty('Game not found', 'This entry no longer exists in your library.', 'Back to library', 'tab-library', 'search') + '</div></div>';
    }

    const heroArtMarkup = heroTag(game, 'alt="" width="900" height="600" fetchpriority="high" decoding="async"');
    const launchable = (game.platforms || []).find((p) => p.appId && installedApp(p.appId));
    const onProfile = (db.profile.favoriteGameIds || []).includes(game.id);
    const inCollections = db.collections.filter((c) => c.gameIds.includes(game.id));
    const metaRows = [
      ['Developer', game.developer],
      ['Publisher', game.publisher],
      ['Released', game.releaseDate ? fmtDate(game.releaseDate) : ''],
      ['Genres', (game.genres || []).join(', ')],
      ['Franchise', game.franchise],
    ].filter(([, value]) => value);

    return '<div class="screen"><div class="hero' + (heroArtMarkup ? '' : ' no-art') + '">' +
      '<div class="hero-bg">' + heroArtMarkup + '</div>' +
      '<div class="hero-top"><button class="iconbtn glass" data-act="back" aria-label="Back">' + icon('back') + '</button>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="iconbtn glass" data-act="toggle-fav" data-id="' + esc(game.id) + '" aria-pressed="' + game.favorite + '" aria-label="Favorite">' + icon('star') + '</button>' +
      '<button class="iconbtn glass" data-act="edit-game" data-id="' + esc(game.id) + '" aria-label="Edit game">' + icon('pencil') + '</button>' +
      '</div></div>' +
      '<div class="hero-card"><div class="hero-cover">' + artMarkup(game) + '</div>' +
      '<div class="hero-info"><span class="tag status ' + esc(game.status) + '">' + esc(STATUS_LABEL[game.status]) + '</span>' +
      '<h1>' + esc(game.title) + '</h1>' +
      '<div class="hero-sub">' + esc([game.franchise, platformNames(game)].filter(Boolean).join(' · ') || 'No platform set') + '</div>' +
      '<div class="hero-tags">' + (game.favorite ? tag('★ Favorite') : '') +
      (game.wishlist ? tag('Wishlist') : '') + (onProfile ? tag('Profile pick') : '') +
      (launchable ? tag('Installed') : '') + '</div></div></div></div>' +

      '<div class="wrap"><div class="detail-layout" style="margin-top:20px">' +
      '<div class="detail-side">' +

      '<div class="panel"><div class="panel-head"><h2 class="panel-title">Your status</h2></div>' +
      '<div class="status-row">' + STATUSES.map(([id, label]) =>
        '<button class="chip" data-act="set-status" data-id="' + esc(game.id) + '" data-status="' + id +
        '" aria-pressed="' + (game.status === id) + '">' + esc(label) + '</button>').join('') + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px">' +
      '<span class="caption">Your rating</span>' +
      '<span class="starpick" role="group" aria-label="Personal rating, ' + esc(game.rating ? game.rating + ' of 5' : 'not rated') + '">' + [1, 2, 3, 4, 5].map((n) =>
        '<button class="' + (n <= game.rating ? 'on' : '') + '" data-act="rate" data-id="' + esc(game.id) +
        '" data-value="' + n + '" aria-pressed="' + (n <= game.rating) + '" aria-label="Rate ' + n +
        ' star' + (n > 1 ? 's' : '') + '">★</button>').join('') +
      '</span></div>' +
      '<div class="facts" style="margin-top:16px">' +
      '<div><div class="fact-label">Added</div><div class="fact-value">' + esc(relTime(game.addedAt)) + '</div></div>' +
      '<div><div class="fact-label">Last played</div><div class="fact-value">' + esc(relTime(game.lastPlayedAt)) + '</div></div>' +
      '<div><div class="fact-label">Launches</div><div class="fact-value">' + esc(game.launchCount) + '</div></div>' +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h2 class="panel-title">Actions</h2></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      (launchable ? '<button class="btn primary" data-act="launch" data-id="' + esc(game.id) + '">' + icon('play') + 'Launch</button>' : '') +
      '<button class="btn" data-act="add-to-collection" data-id="' + esc(game.id) + '">' + icon('folder') + 'Collection</button>' +
      '<button class="btn" data-act="toggle-wish" data-id="' + esc(game.id) + '" aria-pressed="' + game.wishlist + '">' +
      (game.wishlist ? 'On wishlist' : 'Wishlist') + '</button>' +
      '<button class="btn" data-act="toggle-profile-fav" data-id="' + esc(game.id) + '">' + icon('star') +
      (onProfile ? 'Profile pick' : 'Add to profile') + '</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button class="btn ghost sm" style="flex:1" data-act="change-art" data-target="cover" data-id="' + esc(game.id) + '">' + icon('image') + 'Cover</button>' +
      '<button class="btn ghost sm" style="flex:1" data-act="change-art" data-target="background" data-id="' + esc(game.id) + '">' + icon('image') + 'Backdrop</button>' +
      '</div>' +
      ((game.coverKey || game.backgroundKey)
        ? '<button class="btn ghost sm" style="width:100%;margin-top:8px" data-act="remove-art" data-target="game" data-id="' + esc(game.id) + '">' + icon('trash') + 'Remove artwork</button>'
        : '') +
      '<button class="btn ghost sm danger" style="width:100%;margin-top:8px" data-act="delete-game" data-id="' + esc(game.id) + '">' + icon('trash') + 'Remove from library</button>' +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h2 class="panel-title">Platform versions</h2>' +
      '<button class="section-link" data-act="add-platform" data-id="' + esc(game.id) + '">Add</button></div>' +
      '<div class="platform-list">' + (game.platforms || []).map((p, i) =>
        '<span class="platform' + (p.appId && installedApp(p.appId) ? ' installed' : '') + '">' + esc(p.name) +
        '<button class="x" data-act="remove-platform" data-id="' + esc(game.id) + '" data-index="' + i +
        '" aria-label="Remove ' + esc(p.name) + '">' + icon('close') + '</button></span>').join('') +
      (!game.platforms || !game.platforms.length ? '<span class="caption">No versions yet</span>' : '') +
      '</div></div>' +

      '</div><div class="detail-side">' +

      (game.description || metaRows.length
        ? '<div class="panel"><div class="panel-head"><h2 class="panel-title">About the game</h2></div>' +
          (game.description ? '<p class="prose">' + esc(game.description) + '</p>' : '') +
          (metaRows.length ? '<dl class="meta-list" style="margin-top:' + (game.description ? '16px' : '0') + '">' +
            metaRows.map(([label, value]) => '<div class="meta-row"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>').join('') +
            '</dl>' : '') + '</div>'
        : '') +

      (game.notes
        ? '<div class="panel"><div class="panel-head"><h2 class="panel-title">Your notes</h2></div>' +
          '<p class="prose">' + esc(game.notes) + '</p></div>'
        : '') +

      (inCollections.length
        ? '<div class="panel"><div class="panel-head"><h2 class="panel-title">Collections</h2></div>' +
          '<div class="chips wrap">' + inCollections.map((c) =>
            '<button class="chip" data-act="open-collection" data-id="' + esc(c.id) + '">' + esc(c.name) + '</button>').join('') +
          '</div></div>'
        : '') +

      '</div></div></div></div>';
  }

  function screenCollections() {
    const shelves = db.collections;
    return '<div class="screen">' +
      appbar('Collections', shelves.length + (shelves.length === 1 ? ' custom collection' : ' custom collections'), '', backBtn()) +
      '<div class="wrap">' +
      '<button class="btn primary block" data-act="new-collection">' + icon('plus') + 'New collection</button>' +

      '<section class="section">' + sectionHead('Smart collections') +
      '<div class="smart-grid">' + AUTO_COLLECTIONS.map((auto) => {
        const count = db.games.filter(auto.match).length;
        return '<button class="smart" data-act="open-collection" data-id="' + auto.id + '">' + icon(auto.icon) +
          '<span class="smart-text"><span class="smart-name">' + esc(auto.name) + '</span>' +
          '<span class="smart-count">' + count + ' games</span></span></button>';
      }).join('') + '</div></section>' +

      '<section class="section">' + sectionHead('Your shelves') +
      (shelves.length ? '<div class="shelves">' + shelves.map((c) => {
        const first = c.gameIds.map(gameById).filter(Boolean)[0];
        const img = c.artworkKey
          ? artTag({ coverKey: c.artworkKey }, 'cover', 'alt="" width="800" height="450" loading="lazy" decoding="async"')
          : (first ? heroTag(first, 'alt="" width="800" height="450" loading="lazy" decoding="async"') : '');
        return '<button class="shelf" data-act="open-collection" data-id="' + esc(c.id) + '">' +
          img +
          (c.favorite ? '<span class="shelf-fav">' + icon('star') + '</span>' : '') +
          '<span class="shelf-body"><span class="shelf-title">' + esc(c.name) + '</span>' +
          '<span class="shelf-meta">' + c.gameIds.length + (c.gameIds.length === 1 ? ' game' : ' games') + '</span></span></button>';
      }).join('') + '</div>'
        : empty('No custom collections', 'Group games into shelves by franchise, mood or completion plan.', '', '', 'folder')) +
      '</section></div></div>';
  }

  function screenCollection(params) {
    const id = params.id;
    const isAuto = id.startsWith('auto-');
    const collection = isAuto ? null : collectionById(id);
    if (!isAuto && !collection) {
      return '<div class="screen">' + appbar('Collection', '', backBtn()) +
        '<div class="wrap">' + empty('Collection not found', 'It may have been deleted.', 'Back', 'open-collections', 'folder') + '</div></div>';
    }
    const games = collectionGames(id);

    let actions = '';
    if (collection) {
      actions = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">' +
        '<button class="btn sm" data-act="fav-collection" data-id="' + esc(id) + '">' + icon('star') + (collection.favorite ? 'Starred' : 'Star') + '</button>' +
        '<button class="btn sm" data-act="rename-collection" data-id="' + esc(id) + '">' + icon('pencil') + 'Rename</button>' +
        '<button class="btn sm" data-act="collection-art" data-id="' + esc(id) + '">' + icon('image') + 'Artwork</button>' +
        (collection.artworkKey ? '<button class="btn sm danger" data-act="remove-art" data-target="collection" data-id="' + esc(id) + '">' + icon('trash') + 'Remove art</button>' : '') +
        '<button class="btn sm" data-act="collection-add" data-id="' + esc(id) + '">' + icon('plus') + 'Games</button>' +
        '<button class="btn sm" data-act="reorder-toggle">' + (state.reorder ? 'Done' : 'Reorder') + '</button>' +
        '<button class="btn sm danger" data-act="delete-collection" data-id="' + esc(id) + '">' + icon('trash') + 'Delete</button>' +
        '</div>';
    }

    let body;
    if (!games.length) {
      body = empty('No games here', 'Add games to this collection to see them together.', 'Browse library', 'tab-library', 'folder');
    } else if (state.reorder && collection) {
      body = '<div class="list">' + games.map((g, i) =>
        '<div class="row" style="cursor:default"><span class="row-main"><span class="row-title">' + esc(g.title) + '</span></span>' +
        '<button class="iconbtn plain" data-act="move-game" data-id="' + esc(id) + '" data-index="' + i + '" data-dir="-1" aria-label="Move up">' + icon('arrowUp') + '</button>' +
        '<button class="iconbtn plain" data-act="move-game" data-id="' + esc(id) + '" data-index="' + i + '" data-dir="1" aria-label="Move down">' + icon('arrowDown') + '</button>' +
        '<button class="iconbtn plain" data-act="collection-remove" data-id="' + esc(id) + '" data-game="' + esc(g.id) + '" aria-label="Remove">' + icon('close') + '</button>' +
        '</div>').join('') + '</div>';
    } else {
      body = '<div class="grid">' + games.map((g) => card(g)).join('') + '</div>';
    }

    return '<div class="screen">' +
      appbar(collectionName(id), games.length + (games.length === 1 ? ' game' : ' games'), '', backBtn()) +
      '<div class="wrap">' + actions + body + '</div></div>';
  }

  const EVENT_META = {
    added: { icon: 'plus', text: (t) => 'Added <b>' + esc(t) + '</b> to the library' },
    launched: { icon: 'play', text: (t) => 'Launched <b>' + esc(t) + '</b>' },
    completed: { icon: 'check', text: (t) => 'Completed <b>' + esc(t) + '</b>' },
    status: { icon: 'clock', text: (t, extra) => 'Moved <b>' + esc(t) + '</b> to ' + esc(STATUS_LABEL[extra] || extra) },
    removed: { icon: 'trash', text: (t) => 'Removed <b>' + esc(t) + '</b>' },
    artwork: { icon: 'image', text: (t) => 'Updated artwork for <b>' + esc(t) + '</b>' },
    collection: { icon: 'folder', text: (t) => 'Added <b>' + esc(t) + '</b> to a collection' },
  };

  function screenActivity() {
    const games = ownedGames();
    const launches = games.reduce((n, g) => n + g.launchCount, 0);
    const played = games.filter((g) => g.launchCount > 0).length;
    const completed = games.filter((g) => g.status === 'completed').length;
    const completion = games.length ? Math.round((completed / games.length) * 100) : 0;

    const countBy = (fn) => {
      const out = {};
      games.forEach((g) => fn(g).forEach((key) => { if (key) out[key] = (out[key] || 0) + 1; }));
      return out;
    };
    const platforms = countBy((g) => (g.platforms || []).map((p) => p.name));
    const genres = countBy((g) => g.genres || []);
    const maxOf = (obj) => Math.max(1, ...Object.values(obj));
    const chart = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n]) =>
      '<div class="chart-row"><div class="chart-head"><span>' + esc(name) + '</span><span class="n">' + n + '</span></div>' +
      '<div class="chart-track"><span class="chart-fill" style="width:' + Math.round((n / maxOf(obj)) * 100) + '%"></span></div></div>').join('');

    const filteredActivity = state.activityFilter === 'all'
      ? db.activity
      : db.activity.filter((e) => (state.activityFilter === 'status'
        ? (e.type === 'status' || e.type === 'completed')
        : e.type === state.activityFilter));
    const totalEvents = filteredActivity.length;
    const groups = new Map();
    filteredActivity.slice(0, state.activityLimit).forEach((e) => {
      const key = dayKey(e.at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });

    let timeline;
    if (!filteredActivity.length) {
      timeline = db.activity.length
        ? empty('No events match', 'Try another event type.', '', '', 'clock')
        : empty('No activity yet', 'Adding, launching and completing games will appear here.', 'Add a game', 'tab-add', 'clock');
    } else {
      timeline = '';
      groups.forEach((events) => {
        timeline += '<div class="tl"><div class="tl-day">' + esc(fmtDay(events[0].at)) + '</div>' +
          events.map((e) => {
            const meta = EVENT_META[e.type] || { icon: 'sparkle', text: (t) => esc(t) };
            return '<div class="tl-item"><span class="tl-dot">' + icon(meta.icon) + '</span>' +
              '<div class="tl-body"><div class="tl-text">' + meta.text(e.title, e.extra) + '</div>' +
              '<div class="tl-time">' + esc(fmtTime(e.at)) + '</div></div></div>';
          }).join('') + '</div>';
      });
    }

    return '<div class="screen">' + appbar('Activity', 'Your history, derived from recorded events') +
      '<div class="wrap">' +
      statStrip([['Launches', launches], ['Played', played], ['Completed', completed], ['Completion', completion + '%']]) +

      '<section class="section">' + sectionHead('Most played by launches') +
      (games.some((g) => g.launchCount > 0)
        ? '<div class="list">' + games.filter((g) => g.launchCount > 0)
          .sort((a, b) => b.launchCount - a.launchCount).slice(0, 5)
          .map((g) => row(g, g.launchCount + ' ×')).join('') + '</div>'
        : '<p class="caption">No launches recorded yet. Launch a supported Android game to start tracking.</p>') +
      '</section>' +

      (Object.keys(platforms).length ? '<section class="section">' + sectionHead('Platform distribution') +
        '<div class="panel"><div class="chart">' + chart(platforms) + '</div></div></section>' : '') +
      (Object.keys(genres).length ? '<section class="section">' + sectionHead('Genre distribution') +
        '<div class="panel"><div class="chart">' + chart(genres) + '</div></div></section>' : '') +

      '<section class="section">' + sectionHead('Timeline') +
      '<div class="chips" style="margin:0 0 10px">' + ACTIVITY_FILTERS.map(([id, label]) =>
        '<button class="chip" data-act="filter-activity" data-type="' + id + '" aria-pressed="' +
        (state.activityFilter === id) + '">' + esc(label) + '</button>').join('') + '</div>' +
      (totalEvents > state.activityLimit
        ? '<p class="caption" style="margin-bottom:8px">Showing ' + Math.min(state.activityLimit, totalEvents) + ' of ' + totalEvents + ' events</p>'
        : '') +
      timeline +
      (totalEvents > state.activityLimit
        ? '<button class="btn block" style="margin-top:12px" data-act="activity-more">Show 50 more</button>'
        : '') +
      '</section>' +
      '</div></div>';
  }

  function screenProfile() {
    const p = db.profile;
    const avatarKey = p.avatarKey;
    const favorites = (p.favoriteGameIds || []).map(gameById).filter(Boolean);
    const owned = ownedGames();
    const launches = owned.reduce((n, g) => n + g.launchCount, 0);
    const completed = owned.filter((g) => g.status === 'completed').length;

    return '<div class="screen">' +
      appbar('Profile', 'Private · stored on this device',
        '<button class="iconbtn" data-act="open-settings" aria-label="Settings">' + icon('settings') + '</button>') +
      '<div class="wrap">' +
      '<div class="profile-hero">' +
      '<button class="avatar lg" data-act="change-avatar" aria-label="Change profile image">' +
      (avatarKey ? artTag({ coverKey: avatarKey }, 'cover', 'alt="" width="96" height="96" decoding="async"') : esc(initials(p.username || 'Player One'))) + '</button>' +
      '<div class="profile-name">' + esc(p.username || 'Player One') + '</div>' +
      (p.bio ? '<p class="profile-bio">' + esc(p.bio) + '</p>' : '') +
      '<button class="btn sm" data-act="edit-profile">Edit profile</button>' +
      '</div>' +

      '<div style="margin-top:20px">' + statStrip([
        ['Games', owned.length], ['Done', completed], ['Launches', launches], ['Picks', favorites.length],
      ]) + '</div>' +

      '<section class="section">' + sectionHead('Favorite platforms') +
      ((p.favoritePlatforms || []).length
        ? '<div class="chips wrap">' + p.favoritePlatforms.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>'
        : '<p class="caption">Choose the platforms you play most in your profile.</p>') +
      '</section>' +

      '<section class="section">' + sectionHead('Favorite games', 'Library', 'tab-library') +
      (favorites.length
        ? '<div class="rail">' + favorites.map((g) => poster(g)).join('') + '</div>'
        : empty('No favorite games yet', 'Open a game and choose “Add to profile” to feature it here.', '', '', 'star')) +
      '</section>' +

      '<section class="section"><div class="group-card">' +
      '<button class="setrow" data-act="open-settings"><span class="setrow-icon">' + icon('settings') + '</span>' +
      '<span class="setrow-body"><span class="setrow-title">Settings</span>' +
      '<span class="setrow-desc">Appearance, library, artwork, backups</span></span>' +
      '<span class="setrow-end">' + icon('chevron') + '</span></button>' +
      '<button class="setrow" data-act="open-collections"><span class="setrow-icon">' + icon('folder') + '</span>' +
      '<span class="setrow-body"><span class="setrow-title">Collections</span>' +
      '<span class="setrow-desc">' + db.collections.length + ' custom collections</span></span>' +
      '<span class="setrow-end">' + icon('chevron') + '</span></button>' +
      '<button class="setrow" data-act="tab-activity"><span class="setrow-icon">' + icon('clock') + '</span>' +
      '<span class="setrow-body"><span class="setrow-title">Activity</span>' +
      '<span class="setrow-desc">' + db.activity.length + ' recorded events</span></span>' +
      '<span class="setrow-end">' + icon('chevron') + '</span></button>' +
      '</div></section></div></div>';
  }

  const SETTINGS_SECTIONS = [
    ['appearance', 'Appearance', 'Accent colour and motion', 'sparkle'],
    ['library', 'Library defaults', 'View and sorting', 'grid'],
    ['discovery', 'Discovery', 'Android detection', 'search'],
    ['artwork', 'Artwork & catalogue', 'Automatic artwork and provider', 'image'],
    ['activity', 'Activity tracking', 'What gets recorded', 'clock'],
    ['storage', 'Storage & backup', 'Export, restore, delete', 'download'],
    ['privacy', 'Privacy', 'Local data and permissions', 'check'],
    ['about', 'About', 'Version and credits', 'sparkle'],
  ];

  function screenSettings() {
    return '<div class="screen">' + appbar('Settings', 'Everything stays on this device', '', backBtn()) +
      '<div class="wrap"><div class="group-card">' +
      SETTINGS_SECTIONS.map(([id, title, desc, iconName]) =>
        '<button class="setrow" data-act="settings-section" data-section="' + id + '">' +
        '<span class="setrow-icon">' + icon(iconName) + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">' + esc(title) + '</span>' +
        '<span class="setrow-desc">' + esc(desc) + '</span></span>' +
        '<span class="setrow-end">' + icon('chevron') + '</span></button>').join('') +
      '</div>' +
      '<p class="sheet-note">GameVault ' + esc(APP_VERSION()) + ' · local-first · no account</p>' +
      '</div></div>';
  }

  function screenSettingsSection(params) {
    const id = params.id;
    const s = db.settings;
    let body = '';

    if (id === 'appearance') {
      body = '<div class="group-card">' +
        '<div class="setrow" style="align-items:flex-start"><span class="setrow-body">' +
        '<span class="setrow-title">Accent colour</span>' +
        '<span class="setrow-desc">Violet and cyan define the GameVault identity</span></span></div>' +
        '<div class="swatches">' + ACCENTS.map(([key, label, color]) =>
          '<button class="swatch" style="background:' + color + '" data-act="set-accent" data-accent="' + key +
          '" aria-pressed="' + (s.accent === key) + '" aria-label="' + label + '"></button>').join('') + '</div>' +
        toggleRow('Reduce motion', 'Disable transitions and animation', 'toggle-motion', s.reduceMotion) +
        toggleRow('Haptic feedback', 'Vibrate on meaningful actions', 'toggle-haptics', s.haptics) +
        '</div>';
    } else if (id === 'library') {
      body = '<div class="group-card">' +
        '<label class="setrow"><span class="setrow-icon">' + icon('grid') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Default view</span></span>' +
        '<select data-setting="view" style="width:auto;min-height:38px;padding:6px 12px;font-size:13px">' +
        VIEWS.map(([v, label]) => '<option value="' + v + '"' + (s.view === v ? ' selected' : '') + '>' + label + '</option>').join('') +
        '</select></label>' +
        '<label class="setrow"><span class="setrow-icon">' + icon('filters') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Default sorting</span></span>' +
        '<select data-setting="sort" style="width:auto;min-height:38px;padding:6px 12px;font-size:13px">' +
        SORTS.map(([v, label]) => '<option value="' + v + '"' + (s.sort === v ? ' selected' : '') + '>' + label + '</option>').join('') +
        '</select></label></div>';
    } else if (id === 'discovery') {
      body = '<div class="group-card">' +
        '<div class="setrow"><span class="setrow-icon">' + icon('search') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Android detection</span>' +
        '<span class="setrow-desc">' + (host ? 'Available: lists launchable apps on this device' : 'Only available in the Android app') + '</span></span>' +
        '<span class="setrow-value">' + (host ? 'Ready' : 'Unavailable') + '</span></div>' +
        '<div class="setrow"><span class="setrow-icon">' + icon('check') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Duplicates</span>' +
        '<span class="setrow-desc">Apps already in your library are shown as added and cannot be added twice</span></span></div>' +
        '</div>';
    } else if (id === 'artwork') {
      body = '<div class="group-card">' +
        toggleRow('Automatic artwork', 'Keep retrieved artwork unless you replace it', 'toggle-auto-art', s.autoArtwork) +
        '<button class="setrow" data-act="edit-catalogue-key"><span class="setrow-icon">' + icon('cloud') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Catalogue key</span>' +
        '<span class="setrow-desc">' + (s.catalogueKey ? 'RAWG key saved on this device' : 'Not set · online search disabled') + '</span></span>' +
        '<span class="setrow-end">' + icon('chevron') + '</span></button>' +
        '<button class="setrow" data-act="clear-art"><span class="setrow-icon">' + icon('trash') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Clear cached artwork</span>' +
        '<span class="setrow-desc">' + artCountLabel() + ' images stored offline</span></span>' +
        '<span class="setrow-end">' + icon('chevron') + '</span></button></div>';
    } else if (id === 'activity') {
      body = '<div class="group-card">' +
        toggleRow('Track activity', 'Record adds, launches and status changes', 'toggle-track', s.trackActivity) +
        '<button class="setrow" data-act="clear-activity"><span class="setrow-icon">' + icon('trash') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Clear timeline</span>' +
        '<span class="setrow-desc">' + db.activity.length + ' events · statistics on games are kept</span></span>' +
        '<span class="setrow-end">' + icon('chevron') + '</span></button></div>';
    } else if (id === 'storage') {
      body = '<div class="group-card">' +
        '<div class="setrow"><span class="setrow-icon">' + icon('grid') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Library data</span>' +
        '<span class="setrow-desc">' + db.games.length + ' games · ' + db.collections.length + ' collections · ' +
        artCountLabel() + ' artworks' + (storageUsed ? ' · about ' + storageUsed + ' on this device' : '') + '</span></span></div>' +
        '<button class="setrow" data-act="export-backup"><span class="setrow-icon">' + icon('download') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Export backup</span>' +
        '<span class="setrow-desc">Games, collections, profile and artwork in one file</span></span>' +
        '<span class="setrow-end">' + icon('chevron') + '</span></button>' +
        '<button class="setrow" data-act="import-backup"><span class="setrow-icon">' + icon('upload') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Restore backup</span>' +
        '<span class="setrow-desc">Replaces your library after confirmation</span></span>' +
        '<span class="setrow-end">' + icon('chevron') + '</span></button>' +
        '<button class="setrow danger" data-act="delete-data"><span class="setrow-icon">' + icon('trash') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Delete all data</span>' +
        '<span class="setrow-desc">Removes every game, collection and artwork</span></span></button></div>';
    } else if (id === 'privacy') {
      body = '<div class="group-card">' +
        '<div class="setrow"><span class="setrow-icon">' + icon('check') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Local-only storage</span>' +
        '<span class="setrow-desc">No account and no cloud sync. Catalogue searches send only your query to the provider you configured.</span></span></div>' +
        '<div class="setrow"><span class="setrow-icon">' + icon('image') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Permissions</span>' +
        '<span class="setrow-desc">Internet for the catalogue, vibration for haptics. GameVault never reads your files.</span></span></div>' +
        '</div>';
    } else {
      body = '<div class="group-card">' +
        '<div class="setrow"><span class="setrow-icon">' + icon('sparkle') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">GameVault</span>' +
        '<span class="setrow-desc">Version ' + esc(APP_VERSION()) + ' · local-first gaming library</span></span></div>' +
        '<div class="setrow"><span class="setrow-icon">' + icon('cloud') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Catalogue</span>' +
        '<span class="setrow-desc">RAWG, used only when you add your own key. Attribution belongs to the provider.</span></span></div>' +
        '<div class="setrow"><span class="setrow-icon">' + icon('star') + '</span>' +
        '<span class="setrow-body"><span class="setrow-title">Design</span>' +
        '<span class="setrow-desc">AMOLED black, electric violet and arctic cyan.</span></span></div></div>';
    }

    const title = (SETTINGS_SECTIONS.find((x) => x[0] === id) || ['', 'Settings'])[1];
    return '<div class="screen">' + appbar(title, '', '', backBtn()) +
      '<div class="wrap">' + body + '</div></div>';
  }

  function toggleRow(title, desc, action, checked) {
    return '<button class="setrow" data-act="' + action + '" role="switch" aria-checked="' + !!checked + '">' +
      '<span class="setrow-body"><span class="setrow-title">' + esc(title) + '</span>' +
      '<span class="setrow-desc">' + esc(desc) + '</span></span>' +
      '<span class="switch" aria-checked="' + !!checked + '"></span></button>';
  }

  function APP_VERSION() {
    try { if (host && host.appVersion) return host.appVersion(); } catch (e) { /* ignore */ }
    return '1.4';
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
    'settings-section': screenSettingsSection,
  };

  /* ==================================================================== *
   * Render
   * ==================================================================== */

  const app = $('#app');
  const nav = $('#tabbar');
  const overlay = $('#overlay');
  const toastEl = $('#toast');
  const fileInput = $('#file-input');

  function render() {
    try {
      const view = current();
      document.documentElement.dataset.accent = db.settings.accent;
      if (db.settings.reduceMotion) document.documentElement.dataset.motion = 'reduced';
      else delete document.documentElement.dataset.motion;

      const build = SCREENS[view.screen] || SCREENS.home;
      app.innerHTML = build(view.params || {});
      renderNav();
      hydrateImages(app);
      hydrateArt(app);
      hydrateAppIcons(app);
      if (view.screen === 'library') observeLibrary(visibleGames().length);
    } catch (err) {
      reportRenderFailure(err);
    }
  }

  function reportRenderFailure(err) {
    if (window.console && console.error) console.error('GameVault could not draw this screen', err);
    app.innerHTML = '<div class="screen"><div class="wrap"><div class="empty">' +
      '<span class="empty-icon">' + icon('close') + '</span>' +
      '<h3>Something went wrong</h3>' +
      '<p>This screen could not be drawn. Your library is stored on this device and is safe.</p>' +
      '<button class="btn primary" data-act="reload-app">Reload GameVault</button></div></div></div>';
  }

  function renderNav() {
    const items = [
      ['home', 'Home', 'home'],
      ['library', 'Library', 'grid'],
      ['add', 'Add', 'plus'],
      ['activity', 'Activity', 'clock'],
      ['profile', 'Profile', 'user'],
    ];
    nav.innerHTML = items.map(([id, label, iconName]) => {
      if (id === 'add') {
        return '<button class="nav-add" data-act="tab-add" aria-label="Add games">' +
          '<span class="fab">' + icon(iconName) + '</span><span>Add</span></button>';
      }
      return '<button class="nav-item" data-act="tab-' + id + '"' +
        (state.activeTab === id ? ' aria-current="page"' : '') + '>' +
        icon(iconName) + '<span>' + label + '</span></button>';
    }).join('');
  }

  /* ==================================================================== *
   * Overlay, toast
   * ==================================================================== */

  let sheetSeq = 0;

  function openSheet(html, opts) {
    const o = opts || {};
    state.lastFocus = document.activeElement;
    state.formArtwork = null;
    overlay.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" tabindex="-1"' +
      (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' + html + '</div>';
    overlay.hidden = false;
    state.modalOpen = true;

    const sheet = $('.sheet', overlay);
    if (!sheet) return;
    if (!o.label) {
      const heading = $('.sheet-head h2', sheet);
      if (heading) {
        sheetSeq += 1;
        heading.id = 'sheet-title-' + sheetSeq;
        sheet.setAttribute('aria-labelledby', heading.id);
      }
    }
    try { sheet.focus({ preventScroll: true }); } catch (e) { sheet.focus(); }
    hydrateArt(overlay);
  }

  function closeModal() {
    if (!state.modalOpen) return;
    overlay.innerHTML = '';
    overlay.hidden = true;
    state.modalOpen = false;
    state.formArtwork = null;
    state.pendingArt = null;
    const last = state.lastFocus;
    state.lastFocus = null;
    if (last && last.isConnected && typeof last.focus === 'function') {
      try { last.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }

  let toastTimer = null;
  function toast(message, isError) {
    toastEl.textContent = message;
    toastEl.className = 'toast' + (isError ? ' error' : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  /* ==================================================================== *
   * Actions
   * ==================================================================== */

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
    try { result = JSON.parse(host.launchApp(version.appId)); }
    catch (e) { result = { ok: false, message: 'Launch failed' }; }
    if (!result.ok) { toast(result.message || 'Could not launch this game.', true); return; }
    game.launchCount += 1;
    game.lastPlayedAt = Date.now();
    logEvent('launched', game.title, game.id);
    persist();
    haptic(18);
    toast('Launched ' + game.title);
    render();
  }

  function showFormError(form, message) {
    let box = form.querySelector('.field-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'field-error';
      box.setAttribute('role', 'alert');
      form.prepend(box);
    }
    box.textContent = message;
    box.hidden = false;
    const title = form.querySelector('[name="title"]');
    if (title) {
      title.setAttribute('aria-invalid', 'true');
      title.focus();
    }
  }

  function saveGameForm(form) {
    const data = new FormData(form);
    const id = String(data.get('id') || '');
    const title = String(data.get('title') || '').trim();
    if (!title) { showFormError(form, 'Add a title before saving.'); return; }

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

  function confirmDeleteGame(game) {
    openSheet('<div class="sheet-head"><h2>Remove game?</h2></div>' +
      '<p class="body muted">“' + esc(game.title) + '” and its personal data will be removed. Collections keep their other games.</p>' +
      '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button><span class="spacer"></span>' +
      '<button class="btn danger" data-act="confirm-delete-game" data-id="' + esc(game.id) + '">Remove</button></div>');
  }

  function openEditor(game) {
    openSheet('<form id="form-game-edit">' +
      '<input type="hidden" name="id" value="' + esc(game ? game.id : '') + '">' +
      '<div class="sheet-head"><h2>' + (game ? 'Edit game' : 'Add game') + '</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body">' + gameFields(game || {
        title: '', franchise: '', genres: [], platforms: [], status: 'backlog', rating: 0,
        notes: '', description: '', developer: '', publisher: '', releaseDate: '',
      }) + '</div>' +
      '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button class="btn primary" type="submit">Save</button></div></form>');
  }

  function updateFilterCount() {
    const button = $('#filters-count');
    if (button) button.textContent = 'Show ' + visibleGames().length + ' games';
  }

  function openFilters() {
    const genres = [...new Set(db.games.flatMap((g) => g.genres || []))].sort();
    const f = state.filter;
    const select = (key, options, currentValue) =>
      '<select data-filter="' + key + '">' + options.map(([v, label]) =>
        '<option value="' + esc(v) + '"' + (currentValue === v ? ' selected' : '') + '>' + esc(label) + '</option>').join('') + '</select>';

    openSheet('<div class="sheet-head"><h2>Filter &amp; sort</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body">' +
      '<label class="field"><span class="label">Sort by</span><select id="sort-select" data-setting="sort">' +
      SORTS.map(([v, label]) => '<option value="' + v + '"' + (state.sort === v ? ' selected' : '') + '>' + label + '</option>').join('') +
      '</select></label>' +
      '<label class="field"><span class="label">Platform</span>' +
      select('platform', [['all', 'Any platform']].concat(PLATFORMS.map((p) => [p, p])), f.platform) + '</label>' +
      '<label class="field"><span class="label">Genre</span>' +
      select('genre', [['all', 'Any genre']].concat(genres.map((g) => [g, g])), f.genre) + '</label>' +
      '<label class="field"><span class="label">Installed</span>' +
      select('installed', [['all', 'Any'], ['yes', 'Installed on this device'], ['no', 'Not installed']], f.installed) + '</label>' +
      '<label class="field"><span class="label">Completion</span>' +
      select('completion', [['all', 'Any'], ['completed', 'Completed only'], ['incomplete', 'Not completed']], f.completion) + '</label>' +
      '<button class="setrow" data-act="toggle-fav-filter" role="switch" aria-checked="' + f.favorites + '" style="border:0;padding-left:0">' +
      '<span class="setrow-body"><span class="setrow-title">Favorites only</span></span>' +
      '<span class="switch" aria-checked="' + f.favorites + '"></span></button>' +
      '</div><div class="sheet-foot"><button class="btn ghost" data-act="clear-filters">Reset</button>' +
      '<span class="spacer"></span><button class="btn primary" data-act="close-modal" id="filters-count">Show ' +
      visibleGames().length + ' games</button></div>');
  }

  function openCollectionPicker(game) {
    openSheet('<div class="sheet-head"><h2>Add to collection</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      (db.collections.length ? '<div class="picker">' + db.collections.map((c) => {
        const inside = c.gameIds.includes(game.id);
        return '<button class="discover" data-act="collection-toggle-game" data-collection="' + esc(c.id) +
          '" data-game="' + esc(game.id) + '" aria-pressed="' + inside + '">' +
          '<span class="discover-main"><span class="discover-title">' + esc(c.name) + '</span>' +
          '<span class="discover-sub">' + c.gameIds.length + ' games</span></span>' +
          '<span class="tick">' + icon('check') + '</span></button>';
      }).join('') + '</div>' : '<p class="caption">You have no collections yet.</p>') +
      '<div class="sheet-foot"><button class="btn" data-act="new-collection">New collection</button></div>');
  }

  function openCollectionAdd(collection) {
    const candidates = db.games.filter((g) => !collection.gameIds.includes(g.id));
    openSheet('<div class="sheet-head"><h2>Add games</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      (candidates.length ? '<div class="picker">' + candidates.map((g) =>
        '<button class="discover" data-act="collection-toggle-game" data-collection="' + esc(collection.id) +
        '" data-game="' + esc(g.id) + '">' +
        '<span class="discover-main"><span class="discover-title">' + esc(g.title) + '</span>' +
        '<span class="discover-sub">' + esc(platformNames(g) || 'No platform') + '</span></span>' +
        '<span class="tick">' + icon('check') + '</span></button>').join('') + '</div>'
        : '<p class="caption">Every game is already in this collection.</p>'));
  }

  function openPlatformPicker(game) {
    openSheet('<div class="sheet-head"><h2>Add platform version</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="chips wrap">' + PLATFORMS.map((p) =>
        '<button class="chip" data-act="platform-add" data-id="' + esc(game.id) + '" data-platform="' + esc(p) + '">' +
        esc(p) + '</button>').join('') + '</div>' +
      '<form id="form-custom-platform" style="margin-top:16px">' +
      '<input type="hidden" name="id" value="' + esc(game.id) + '">' +
      '<label class="field"><span class="label">Custom platform</span>' +
      '<input name="name" placeholder="e.g. Retro handheld" maxlength="40" autocomplete="off"></label>' +
      '<button class="btn block" type="submit" style="margin-top:12px">Add custom platform</button></form>');
  }

  function openProfileEditor() {
    const p = db.profile;
    openSheet('<form id="form-profile"><div class="sheet-head"><h2>Edit profile</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body">' +
      '<label class="field"><span class="label">Username</span>' +
      '<input name="username" maxlength="40" autocomplete="off" spellcheck="false" value="' + esc(p.username) + '"></label>' +
      '<label class="field"><span class="label">Short biography</span>' +
      '<textarea name="bio" maxlength="240" rows="3" autocomplete="off">' + esc(p.bio) + '</textarea></label>' +
      '<div class="field"><span class="label">Favorite platforms</span><div class="chips wrap">' +
      PLATFORMS.map((platform) => '<button type="button" class="chip" data-act="profile-platform" data-platform="' +
        esc(platform) + '" aria-pressed="' + ((p.favoritePlatforms || []).includes(platform)) + '">' +
        esc(platform) + '</button>').join('') + '</div></div>' +
      '</div><div class="sheet-foot"><button type="button" class="btn" data-act="change-avatar">Change image</button>' +
      (db.profile.avatarKey ? '<button type="button" class="btn ghost" data-act="remove-art" data-target="avatar">Remove image</button>' : '') +
      '<span class="spacer"></span><button class="btn primary" type="submit">Save</button></div></form>');
  }

  function openCatalogueKey() {
    openSheet('<form id="form-catalogue-key">' +
      '<div class="sheet-head"><h2>Catalogue key</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body"><label class="field"><span class="label">RAWG API key</span>' +
      '<input name="key" autocomplete="off" value="' + esc(db.settings.catalogueKey) + '"></label>' +
      '<p class="sheet-note">Stored only on this device and sent only to api.rawg.io. Leave empty to disable online search.</p>' +
      '</div><button class="btn primary block" type="submit">Save key</button></form>');
  }

  function openNewCollection() {
    openSheet('<form id="form-new-collection">' +
      '<div class="sheet-head"><h2>New collection</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<label class="field"><span class="label">Name</span>' +
      '<input name="name" required maxlength="60" autocomplete="off" placeholder="e.g. Resident Evil"></label>' +
      '<p class="sheet-note">A game can belong to several collections.</p>' +
      '<button class="btn primary block" type="submit" style="margin-top:14px">Create collection</button></form>');
  }

  function openRenameCollection(collection) {
    openSheet('<form id="form-rename-collection">' +
      '<input type="hidden" name="id" value="' + esc(collection.id) + '">' +
      '<div class="sheet-head"><h2>Rename collection</h2>' +
      '<button class="iconbtn plain" data-act="close-modal" aria-label="Close">' + icon('close') + '</button></div>' +
      '<label class="field"><span class="label">Name</span>' +
      '<input name="name" required maxlength="60" autocomplete="off" value="' + esc(collection.name) + '"></label>' +
      '<button class="btn primary block" type="submit" style="margin-top:14px">Save name</button></form>');
  }

  const pickAvatar = () => { state.pendingArt = { kind: 'avatar' }; fileInput.value = ''; fileInput.click(); };

  /* ==================================================================== *
   * Event handling
   * ==================================================================== */

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
      case 'settings-section': go('settings-section', { id: target.dataset.section }); break;
      case 'open-collections': go('collections'); break;
      case 'open-collection': go('collection', { id }); break;
      case 'open-game': go('game', { id }); break;
      case 'close-modal': closeModal(); break;
      case 'edit-game': { const g = gameById(id); if (g) openEditor(g); break; }
      case 'set-status': { const g = gameById(id); if (g) setStatus(g, target.dataset.status); break; }
      case 'rate': {
        const g = gameById(id);
        if (!g) break;
        const value = Number(target.dataset.value);
        if (g.rating === value) { g.rating = 0; toast('Rating cleared'); }
        else g.rating = value;
        persist(); haptic(8); render();
        break;
      }
      case 'toggle-fav': {
        const g = gameById(id);
        if (g) { g.favorite = !g.favorite; persist(); haptic(10); render(); }
        break;
      }
      case 'toggle-wish': {
        const g = gameById(id);
        if (g) { g.wishlist = !g.wishlist; persist(); haptic(10); render(); }
        break;
      }
      case 'toggle-profile-fav': {
        const list = db.profile.favoriteGameIds || (db.profile.favoriteGameIds = []);
        const index = list.indexOf(id);
        if (index >= 0) list.splice(index, 1);
        else { list.unshift(id); if (list.length > 8) list.length = 8; }
        persist(); haptic(10);
        toast(index >= 0 ? 'Removed from profile favorites' : 'Added to profile favorites');
        render();
        break;
      }
      case 'launch': { const g = gameById(id); if (g) launchGame(g); break; }
      case 'delete-game': { const g = gameById(id); if (g) confirmDeleteGame(g); break; }
      case 'confirm-delete-game': {
        const g = gameById(id);
        if (!g) break;
        db.games = db.games.filter((x) => x.id !== g.id);
        db.collections.forEach((c) => { c.gameIds = c.gameIds.filter((x) => x !== g.id); });
        db.profile.favoriteGameIds = (db.profile.favoriteGameIds || []).filter((x) => x !== g.id);
        logEvent('removed', g.title);
        persist();
        closeModal();
        tabTo('library');
        toast('Removed ' + g.title);
        break;
      }
      case 'add-platform': { const g = gameById(id); if (g) openPlatformPicker(g); break; }
      case 'platform-add': {
        const g = gameById(target.dataset.id);
        if (g) {
          const name = target.dataset.platform;
          if (!(g.platforms || []).some((p) => p.name === name)) {
            g.platforms = (g.platforms || []).concat({ name, appId: null });
            persist();
          }
          closeModal();
          render();
        }
        break;
      }
      case 'remove-platform': {
        const g = gameById(id);
        if (g) { g.platforms.splice(Number(target.dataset.index), 1); persist(); render(); }
        break;
      }
      case 'add-to-collection': { const g = gameById(id); if (g) openCollectionPicker(g); break; }
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
          render();
        }
        break;
      }
      case 'new-collection': openNewCollection(); break;
      case 'rename-collection': { const c = collectionById(id); if (c) openRenameCollection(c); break; }
      case 'fav-collection': {
        const c = collectionById(id);
        if (c) { c.favorite = !c.favorite; persist(); haptic(10); render(); }
        break;
      }
      case 'delete-collection': {
        const c = collectionById(id);
        if (!c) break;
        openSheet('<div class="sheet-head"><h2>Delete “' + esc(c.name) + '”?</h2></div>' +
          '<p class="body muted">The shelf is removed. Its games stay in your library.</p>' +
          '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button>' +
          '<span class="spacer"></span><button class="btn danger" data-act="confirm-delete-collection" data-id="' +
          esc(c.id) + '">Delete</button></div>');
        break;
      }
      case 'confirm-delete-collection': {
        db.collections = db.collections.filter((c) => c.id !== id);
        persist();
        closeModal();
        tabTo('collections');
        break;
      }
      case 'collection-add': { const c = collectionById(id); if (c) openCollectionAdd(c); break; }
      case 'collection-remove': {
        const c = collectionById(id);
        if (c) {
          c.gameIds = c.gameIds.filter((g) => g !== target.dataset.game);
          persist();
          render();
        }
        break;
      }
      case 'reorder-toggle': state.reorder = !state.reorder; render(); break;
      case 'move-game': {
        const c = collectionById(id);
        if (!c) break;
        const index = Number(target.dataset.index);
        const next = index + Number(target.dataset.dir);
        if (next < 0 || next >= c.gameIds.length) break;
        const [moved] = c.gameIds.splice(index, 1);
        c.gameIds.splice(next, 0, moved);
        persist();
        render();
        break;
      }
      case 'remove-art': {
        const kind = target.dataset.target;
        if (kind === 'collection') {
          const c = collectionById(target.dataset.id);
          if (c) {
            c.artworkKey = null;
            persist(); closeModal(); render();
            toast('Collection artwork removed');
          }
        } else if (kind === 'avatar') {
          db.profile.avatarKey = null;
          persist(); closeModal(); render();
          toast('Profile image removed');
        } else {
          const g = gameById(target.dataset.id);
          if (g) {
            g.coverKey = null;
            g.backgroundKey = null;
            g.coverUrl = null;
            g.backgroundUrl = null;
            g.customArt = false;
            persist(); render();
            toast('Artwork removed');
          }
        }
        break;
      }
      case 'form-art-clear': {
        state.formArtwork = null;
        const preview = $('#form-art-preview');
        if (preview) preview.innerHTML = formArtPreview(null);
        target.hidden = true;
        break;
      }
      case 'change-art': {
        const kind = target.dataset.target;
        if (kind === 'avatar') { pickAvatar(); break; }
        state.pendingArt = { kind: kind === 'background' ? 'background' : 'cover', id: target.dataset.id || null };
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
      case 'change-avatar': pickAvatar(); break;
      case 'edit-profile': openProfileEditor(); break;
      case 'profile-platform': {
        const platform = target.dataset.platform;
        const list = db.profile.favoritePlatforms || (db.profile.favoritePlatforms = []);
        const index = list.indexOf(platform);
        if (index >= 0) list.splice(index, 1);
        else list.push(platform);
        persist();
        target.setAttribute('aria-pressed', String(index < 0));
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
      case 'catalogue-retry': runCatalogueSearch(state.catalogueQuery); break;
      case 'form-platform': {
        const platform = target.dataset.platform;
        const index = state.formPlatforms.indexOf(platform);
        if (index >= 0) state.formPlatforms.splice(index, 1);
        else state.formPlatforms.push(platform);
        target.setAttribute('aria-pressed', String(index < 0));
        break;
      }
      case 'set-view':
        state.view = target.dataset.view;
        db.settings.view = state.view;
        persist();
        render();
        break;
      case 'filter-status':
        state.filter.status = target.dataset.status;
        state.limit = PAGE;
        render();
        break;
      case 'clear-filters':
        state.filter = { platform: 'all', genre: 'all', status: 'all', favorites: false, installed: 'all', completion: 'all' };
        state.query = '';
        state.limit = PAGE;
        render();
        break;
      case 'activity-more':
        state.activityLimit += 50;
        render();
        break;
      case 'filter-activity':
        state.activityFilter = target.dataset.type || 'all';
        state.activityLimit = 50;
        render();
        break;
      case 'reload-app':
        window.location.reload();
        break;
      case 'open-filters': openFilters(); break;
      case 'toggle-fav-filter': {
        state.filter.favorites = !state.filter.favorites;
        state.limit = PAGE;
        target.setAttribute('aria-checked', String(state.filter.favorites));
        const knob = target.querySelector('.switch');
        if (knob) knob.setAttribute('aria-checked', String(state.filter.favorites));
        refreshLibrary(true);
        updateFilterCount();
        break;
      }
      case 'clear-filter': {
        const key = target.dataset.key;
        if (key && state.filter[key] !== undefined) {
          state.filter[key] = 'all';
          state.limit = PAGE;
          render();
        }
        break;
      }
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
      case 'confirm-clear-art': clearArtworkNow(); break;
      case 'clear-activity': clearActivity(); break;
      case 'confirm-clear-activity': clearActivityNow(); break;
      case 'export-backup': requestExport(); break;
      case 'confirm-export': exportBackupNow(target.dataset.art !== '0'); break;
      case 'import-backup': importBackup(); break;
      case 'delete-data': confirmDeleteAll(); break;
      case 'confirm-delete-all': deleteAllData(); break;
      case 'confirm-restore': restorePending(); break;
      default: break;
    }
  }

  document.addEventListener('click', onClick);

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || !form.id) return;

    if (form.id === 'form-game' || form.id === 'form-game-edit') {
      e.preventDefault();
      saveGameForm(form);
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
      closeModal();
      render();
      toast('Profile saved');
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
        closeModal();
        render();
      }
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') {
      e.target.removeAttribute('aria-invalid');
      const error = e.target.form && e.target.form.querySelector('.field-error');
      if (error) error.hidden = true;
    }
    if (e.target.id === 'lib-search') {
      state.query = e.target.value;
      refreshLibrary(true);
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
    if (target.dataset && target.dataset.filter) {
      state.filter[target.dataset.filter] = target.value;
      state.limit = PAGE;
      refreshLibrary(true);
      updateFilterCount();
    } else if (target.dataset && target.dataset.setting) {
      db.settings[target.dataset.setting] = target.value;
      if (target.dataset.setting === 'view') state.view = target.value;
      if (target.dataset.setting === 'sort') {
        state.sort = target.value;
        state.limit = PAGE;
      }
      persist();
      render();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) handleFile(file);
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.modalOpen) closeModal();
      else back();
      return;
    }
    if (e.key === 'Tab' && state.modalOpen) {
      const sheet = $('.sheet', overlay);
      if (!sheet) return;
      const items = $$('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', sheet)
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); sheet.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('scroll', () => {
    const bar = $('.appbar');
    if (bar) bar.classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });

  /* hydrate images that arrive after the initial render */
  document.addEventListener('load', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.target.classList.add('loaded');
  }, true);

  /* remote artwork that fails should fall back to the initials tile */
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.failed) return;
    img.dataset.failed = '1';
    img.removeAttribute('src');
    img.style.display = 'none';
    const holder = img.closest('.art');
    if (holder) holder.classList.add('art-fallback');
  }, true);

  /* ==================================================================== *
   * Discovery
   * ==================================================================== */

  function scanDevice() {
    if (!host) { toast('Device discovery is only available in the app.', true); return; }
    state.discoveryBusy = true;
    state.selected.clear();
    render();
    setTimeout(() => {
      try {
        const list = JSON.parse(host.getInstalledApps() || '[]');
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
      const iconData = app.icon || (host && host.getAppIcon
        ? (() => { try { return host.getAppIcon(app.packageName) || ''; } catch (e) { return ''; } })()
        : '');
      if (iconData && iconData.startsWith('data:')) {
        try { coverKey = await storeArt(iconData, 120); } catch (e) { coverKey = null; }
      }
      const game = normalizeGame({
        id: uid(),
        title: app.label,
        platforms: [{ name: 'Android', appId: app.packageName }],
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
      toast('Added ' + added + (added === 1 ? ' game' : ' games'));
      tabTo('library');
    } else {
      render();
    }
  }

  /* ==================================================================== *
   * Catalogue
   * ==================================================================== */

  function saveCatalogueKey(form) {
    const key = String(new FormData(form).get('key') || '').trim();
    db.settings.catalogueKey = key;
    persist();
    closeModal();
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
      const response = await fetchWithTimeout(url, 12000);
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
      if (err && err.name === 'AbortError') state.catalogueError = 'The catalogue took too long to answer.';
      else if (navigator.onLine === false) state.catalogueError = 'This device is offline.';
      else state.catalogueError = (err && err.message) || 'Network request failed.';
    } finally {
      state.catalogueBusy = false;
      render();
    }
  }

  async function addFromCatalogue(index) {
    const item = (state.catalogue || [])[index];
    if (!item) return;
    const key = (db.settings.catalogueKey || '').trim();
    let detail = null;
    try {
      if (key) {
        const response = await fetchWithTimeout('https://api.rawg.io/api/games/' + item.id + '?key=' + encodeURIComponent(key), 15000);
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
      addedAt: Date.now(),
      coverUrl: item.image || null,
      source: 'catalogue',
    });

    const duplicate = db.games.find((g) => g.title.toLowerCase() === meta.title.toLowerCase());
    if (duplicate) {
      duplicate.platforms = mergePlatforms(duplicate.platforms, platforms.map((p) => p.name), true);
      persist();
      toast('Merged into existing ' + duplicate.title);
      go('game', { id: duplicate.id });
      return;
    }

    if (item.image && db.settings.autoArtwork) {
      try {
        const response = await fetchWithTimeout(item.image, 20000);
        const blob = await response.blob();
        const dataUrl = await shrinkImage(blob, 900);
        if (dataUrl) {
          meta.coverKey = await storeArt(dataUrl, 480);
          meta.backgroundKey = meta.coverKey;
        }
      } catch (e) { /* keep remote URL */ }
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

  /* ==================================================================== *
   * Artwork
   * ==================================================================== */

  function makeThumb(dataUrl, maxSize) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  async function storeArt(dataUrl, thumbMax) {
    let thumb = null;
    try { thumb = await makeThumb(dataUrl, thumbMax || 420); } catch (e) { thumb = null; }
    const key = await Art.put(dataUrl, thumb);
    ART[key] = dataUrl;
    refreshArtCount();
    return key;
  }

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
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
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
      db.profile.avatarKey = await storeArt(dataUrl, 160);
      persist(); render(); toast('Profile image updated');
      return;
    }

    if (pending.kind === 'collection') {
      const collection = collectionById(pending.id);
      if (collection) {
        collection.artworkKey = await storeArt(dataUrl, 700);
        persist(); render(); toast('Collection artwork updated');
      }
      return;
    }

    const game = pending.id ? gameById(pending.id) : null;
    if (game) {
      const key = await storeArt(dataUrl, 1100);
      if (pending.kind === 'background') game.backgroundKey = key;
      else { game.coverKey = key; game.backgroundKey = game.backgroundKey || key; }
      game.customArt = true;
      logEvent('artwork', game.title, game.id);
      persist(); render(); toast('Artwork updated');
      return;
    }

    state.formArtwork = await storeArt(dataUrl, 1100);
    const preview = $('#form-art-preview');
    if (preview) {
      preview.innerHTML = formArtPreview(null);
      const field = preview.parentElement;
      const clear = field && field.querySelector('[data-act="form-art-clear"]');
      if (clear) clear.hidden = false;
    }
    toast('Artwork attached — save the game to keep it');
  }

  function clearArtwork() {
    openSheet('<div class="sheet-head"><h2>Clear cached artwork?</h2></div>' +
      '<p class="body muted">Every stored image is deleted, including covers you added. Games, notes and collections stay.</p>' +
      '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button class="btn danger" data-act="confirm-clear-art">Clear artwork</button></div>');
  }

  async function clearArtworkNow() {
    await Art.clear();
    Object.keys(ART).forEach((k) => delete ART[k]);
    db.games.forEach((g) => { g.coverKey = null; g.backgroundKey = null; });
    db.collections.forEach((c) => { c.artworkKey = null; });
    db.profile.avatarKey = null;
    persist();
    closeModal();
    render();
    toast('Artwork cache cleared');
  }

  /* ==================================================================== *
   * Backup
   * ==================================================================== */

  async function buildBackup(includeArtwork) {
    const art = {};
    if (includeArtwork !== false) {
      const referenced = new Set();
      db.games.forEach((g) => { if (g.coverKey) referenced.add(g.coverKey); if (g.backgroundKey) referenced.add(g.backgroundKey); });
      db.collections.forEach((c) => { if (c.artworkKey) referenced.add(c.artworkKey); });
      if (db.profile.avatarKey) referenced.add(db.profile.avatarKey);
      const keys = [...referenced];
      const values = await Art.getMany(keys);
      keys.forEach((key) => { if (values[key]) art[key] = values[key]; });
    }

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

  const backupSizeLabel = (bytes) => (bytes > 1048576
    ? (bytes / 1048576).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB');

  async function requestExport() {
    let json = '';
    try { json = await buildBackup(true); }
    catch (e) { toast('Could not prepare the backup.', true); return; }
    if (json.length > 6 * 1048576) {
      openSheet('<div class="sheet-head"><h2>Large backup</h2></div>' +
        '<p class="body muted">This backup is about ' + backupSizeLabel(json.length) + ' because it includes artwork. ' +
        'Exporting without artwork is far smaller; covers stay in your library on this device.</p>' +
        '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button><span class="spacer"></span>' +
        '<button class="btn" data-act="confirm-export" data-art="0">Without artwork</button>' +
        '<button class="btn primary" data-act="confirm-export" data-art="1">Export all</button></div>');
      return;
    }
    writeBackup(json);
  }

  async function exportBackupNow(includeArtwork) {
    let json = '';
    try { json = await buildBackup(includeArtwork); }
    catch (e) { toast('Could not prepare the backup.', true); return; }
    closeModal();
    writeBackup(json);
  }

  function writeBackup(json) {
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

  function applyBackup(json) {
    let parsed;
    try { parsed = JSON.parse(json); }
    catch (e) { toast('That file is not valid JSON.', true); return; }

    const payload = parsed && parsed.data ? parsed.data : parsed;
    if (!payload || !Array.isArray(payload.games)) {
      toast('That file is not a GameVault backup.', true);
      return;
    }

    state.pendingRestore = parsed;
    openSheet('<div class="sheet-head"><h2>Restore this backup?</h2></div>' +
      '<p class="body muted">The file contains <b>' + payload.games.length + '</b> games. Restoring replaces your library of ' +
      db.games.length + ' games, its collections and profile. Export first if you might want the current data back.</p>' +
      '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button class="btn danger" data-act="confirm-restore">Replace library</button></div>');
  }

  function restorePending() {
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

    Object.entries(parsed.artwork || {}).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('data:')) ART[key] = value;
    });

    state.pendingRestore = null;
    db = restored;
    persist();
    closeModal();
    tabTo('home');
    toast('Backup restored · ' + restored.games.length + ' games');
  }

  function clearActivity() {
    openSheet('<div class="sheet-head"><h2>Clear the timeline?</h2></div>' +
      '<p class="body muted">Recorded events are removed. Launch counts stored on games are kept.</p>' +
      '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button class="btn danger" data-act="confirm-clear-activity">Clear timeline</button></div>');
  }

  function clearActivityNow() {
    db.activity = [];
    persist();
    closeModal();
    render();
    toast('Timeline cleared');
  }

  function confirmDeleteAll() {
    openSheet('<div class="sheet-head"><h2>Delete all data?</h2></div>' +
      '<p class="body muted">Every game, collection, note and artwork will be removed from this device. This cannot be undone.</p>' +
      '<div class="sheet-foot"><button class="btn ghost" data-act="close-modal">Cancel</button>' +
      '<span class="spacer"></span><button class="btn danger" data-act="confirm-delete-all">Delete everything</button></div>');
  }

  async function deleteAllData() {
    db = emptyDb();
    persist();
    await Art.clear();
    Object.keys(ART).forEach((k) => delete ART[k]);
    closeModal();
    tabTo('home');
    toast('All local data deleted');
  }

  /* ==================================================================== *
   * Boot
   * ==================================================================== */

  function boot() {
    state.sort = db.settings.sort;
    state.view = db.settings.view;
    renderNav();
    render();
    refreshArtCount().then(() => {
      const view = current().screen;
      if (view === 'settings' || view === 'settings-section') render();
    }).catch(() => { /* artwork unavailable */ });
  }

  boot();
})();
