(function () {
  const STORAGE_KEY = "linkboard.v1";
  const INITIAL_COLUMN_COUNT = 4;

  // Private helpers: keep logic byte-for-byte identical to app.js
  function uid(prefix = "") {
    const randomId = Math.random().toString(36).slice(2, 9);
    return prefix ? `${prefix}_${randomId}` : randomId;
  }

  function sanitizeIdInternal(value) {
    // Convert to string, limit length, allow only safe characters
    return String(value ?? '')
      .slice(0, 128)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function ensureUniqueId(rawId, seen, prefix) {
    let sanitized = sanitizeIdInternal(rawId);
    if (!sanitized) sanitized = uid(prefix);
    while (seen.has(sanitized)) {
      sanitized = uid(prefix);
    }
    seen.add(sanitized);
    return sanitized;
  }

  function createBlankColumns(count = INITIAL_COLUMN_COUNT) {
    return Array.from({ length: count }, (_, idx) => ({
      id: uid(),
      title: `Column ${idx + 1}`,
      cards: [],
    }));
  }

  function createInitialState() {
    return { columns: createBlankColumns() };
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Save failed:', e);
      alert('⚠️ Save failed (storage full or blocked). Please Export your data immediately to avoid losing changes.');
    }
  }

  function ensureColumns(state) {
    if (!state || typeof state !== 'object') state = { columns: [] };
    if (!Array.isArray(state.columns)) state.columns = [];
    if (state.columns.length === 0) {
      state.columns = createBlankColumns();
    }
    return state;
  }

  function migrateState(state) {
    if (!state || !Array.isArray(state.columns)) {
      state = createInitialState();
      return state;
    }
    const seenColumnIds = new Set();
    const seenCardIds = new Set();

    state.columns = state.columns.map((c) => ({
      id: ensureUniqueId(c.id, seenColumnIds, "col"),
      title: c.title || "Untitled",
      cards: Array.isArray(c.cards)
        ? c.cards.map(card => ({
            ...card,
            id: ensureUniqueId(card.id, seenCardIds, "card")
          }))
        : [],
    }));

    state = ensureColumns(state);
    return state;
  }

  window.LinkBoardStorage = {
    STORAGE_KEY,
    INITIAL_COLUMN_COUNT,
    createBlankColumns,
    createInitialState,
    loadState,
    saveState,
    migrateState,
    ensureColumns,
  };
})();


