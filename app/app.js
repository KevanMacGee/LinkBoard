// ——— Theme ———
const THEME_KEY = "linkboard.theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const b = document.getElementById("btnTheme");
  if (b) {
    b.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  }
}
(function initTheme() {
  let saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    saved = mql && mql.matches ? "dark" : "light";
  }
  applyTheme(saved);
  const btn = document.getElementById("btnTheme");
  if (btn) {
    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, cur);
      } catch (e) {
        console.warn('Theme preference could not be saved:', e);
      }
      applyTheme(cur);
    });
  }
})();

// ——— Data & Storage ———
const STORAGE_KEY = "linkboard.v1";

const INITIAL_COLUMN_COUNT = 4;

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

/** @typedef {{id:string,url:string,title?:string,note?:string}} Card */
/** @type {{columns: {id:string,title:string,cards: Card[]}[]}} */
let state = load();
if (!state) state = createInitialState();
migrateState();
save();

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed:', e);
    alert('⚠️ Save failed (storage full or blocked). Please Export your data immediately to avoid losing changes.');
  }
}

// ——— Utils ———
function uid(prefix = "") {
  const randomId = Math.random().toString(36).slice(2, 9);
  return prefix ? `${prefix}_${randomId}` : randomId;
}
function ensureUniqueId(rawId, seen, prefix) {
  let sanitized = sanitizeId(rawId);
  if (!sanitized) sanitized = uid(prefix);
  while (seen.has(sanitized)) {
    sanitized = uid(prefix);
  }
  seen.add(sanitized);
  return sanitized;
}
function domainFrom(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function normalizeUrl(value) {
  if (typeof value !== "string") return "";
  let raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("//")) {
    raw = "https:" + raw;
  } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    raw = "https://" + raw;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}
function favicon(url) {
  const host = domainFrom(url);
  return `https://icons.duckduckgo.com/ip2/${host}.ico`;
}
function ensureColumns() {
  if (!Array.isArray(state.columns)) state.columns = [];
  if (state.columns.length === 0) {
    state.columns = createBlankColumns();
  }
}
function migrateState() {
  if (!state || !Array.isArray(state.columns)) {
    state = createInitialState();
    return;
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
  ensureColumns();
}

// ——— Rendering ———
const boardEl = document.getElementById("board");
const searchEl = document.getElementById("q");
const searchClearEl = document.getElementById("qClear");
const searchHintEl = document.getElementById("searchHint");
function wiggleSearchHint() {
  if (!searchHintEl) return;
  const inner = searchHintEl.querySelector('.search-hint-inner');
  if (!inner) return;
  inner.classList.remove("wiggle");
  void inner.offsetWidth; // restart animation
  inner.classList.add("wiggle");
}

function render() {
  ensureColumns();
  boardEl.innerHTML = "";
  const q = searchEl.value.trim().toLowerCase();
  if (searchHintEl) {
    let inner = searchHintEl.querySelector('.search-hint-inner');
    if (!inner) {
      inner = document.createElement('span');
      inner.className = 'search-hint-inner';
      searchHintEl.replaceChildren(inner);
    }
    if (q) {
      inner.textContent = "Card dragging is disabled while search is active";
      searchHintEl.classList.add("visible");
    } else {
      inner.textContent = "";
      searchHintEl.classList.remove("visible");
    }
  }
  if (searchClearEl) {
    searchClearEl.hidden = !q;
  }
  if (q) {
    searchEl.classList.add("has-clear");
  } else {
    searchEl.classList.remove("has-clear");
  }
  for (const col of state.columns) {
    const colEl = document.createElement("section");
    colEl.className = "col";
    colEl.dataset.colId = col.id;
    // OLD (pattern replaced for security - Issue 1):
    // colEl.innerHTML = `<header><h2>${escapeHTML(col.title)}</h2></header><ul class="list" id="list-${escapeAttr(col.id)}"></ul>`;
    
    // NEW (safe DOM APIs with sanitizeId at render time):
    const header = document.createElement('header');
    const h2 = document.createElement('h2');
    h2.textContent = col.title;
    header.appendChild(h2);

    const list = document.createElement('ul');
    list.className = 'list';
    list.id = `list-${sanitizeId(col.id)}`;

    colEl.replaceChildren(header, list); // clears any previous children, then inserts
    const items = (col.cards || []).filter((card) => !q || matches(card, q));
    if (!items.length) {
      const emptyMsg = q ? "No matching links" : "No links yet";
      list.insertAdjacentHTML("beforeend", `<li class="empty">${emptyMsg}</li>`);
    } else {
      for (const card of items) {
        list.appendChild(cardEl(card));
      }
    }
    boardEl.appendChild(colEl);
    makeSortable(list);
  }
}

function matches(card, q) {
  return (
    (card.title || "").toLowerCase().includes(q) ||
    (card.url || "").toLowerCase().includes(q) ||
    (card.note || "").toLowerCase().includes(q)
  );
}

function cardEl(card) {
  const li = document.createElement("li");
  li.className = "card";
  li.dataset.cardId = card.id;

  const normalizedUrl = normalizeUrl(card.url || "");
  const displayUrl = normalizedUrl || (typeof card.url === "string" ? card.url.trim() : "");
  const titleText = (card.title || "").trim() || domainFrom(displayUrl) || displayUrl || "Untitled";

  const iconDiv = document.createElement("div");
  iconDiv.className = "icon";
  if (normalizedUrl) {
    const img = document.createElement("img");
    img.src = favicon(normalizedUrl);
    img.alt = "";
    img.setAttribute('role', 'presentation');
    iconDiv.appendChild(img);
  }

  const contentDiv = document.createElement("div");
  if (normalizedUrl) {
    const link = document.createElement("a");
    link.className = "title";
    link.textContent = titleText;
    link.href = normalizedUrl;
    link.target = "_blank";
    link.rel = "noopener";
    contentDiv.appendChild(link);
  } else {
    const span = document.createElement("span");
    span.className = "title";
    span.textContent = titleText;
    contentDiv.appendChild(span);
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  const domainText = domainFrom(displayUrl);
  const noteText = (card.note || "").trim();
  if (domainText) meta.append(domainText);
  if (noteText) {
    if (domainText) meta.append(" • ");
    meta.append(noteText);
  }
  contentDiv.appendChild(meta);

  const buttons = document.createElement("div");
  buttons.className = "buttons";
  const editBtn = document.createElement("button");
  editBtn.className = "btn-icon";
  editBtn.title = "Edit";
  editBtn.setAttribute("aria-label", "Edit");
  editBtn.dataset.act = "edit";
  editBtn.textContent = "✎";
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-icon";
  deleteBtn.title = "Delete";
  deleteBtn.setAttribute("aria-label", "Delete");
  deleteBtn.dataset.act = "del";
  deleteBtn.textContent = "🗑";
  buttons.append(editBtn, deleteBtn);

  li.append(iconDiv, contentDiv, buttons);

  li.addEventListener("click", (e) => {
    const act = e.target?.dataset?.act;
    if (act === "edit") openDialog(card, findColIdByCard(card.id));
    if (act === "del") removeCard(card.id);
  });
  return li;
}

function findColIdByCard(id) {
  ensureColumns();
  const idStr = String(id);
  for (const c of state.columns) {
    if (c.cards.some((x) => String(x.id) === idStr)) return c.id;
  }
  return state.columns[0]?.id || null;
}

function makeSortable(listEl) {
  if (typeof Sortable === "undefined") {
    return;
  } // graceful if CDN blocked
  new Sortable(listEl, {
    group: { name: "board", pull: true, put: true },
    animation: 150,
    emptyInsertThreshold: 10,
    draggable: ".card",
    onStart() {
      if (searchEl.value.trim()) {
        wiggleSearchHint();
      }
    },
    onEnd() {
      persistOrder();
    },
  });
}

function persistOrder() {
  if (searchEl.value.trim()) {
    render();
    return;
  }
  const newState = { columns: [] };
  for (const col of state.columns) {
    const listEl = document.getElementById("list-" + col.id);
    if (!listEl) {
      newState.columns.push({ id: col.id, title: col.title, cards: col.cards });
      continue;
    }
    const ids = Array.from(listEl.querySelectorAll(".card")).map((li) => li.dataset.cardId);
    const newCards = ids.map((id) => findCardById(id)).filter(Boolean);
    newState.columns.push({ id: col.id, title: col.title, cards: newCards });
  }
  state = newState;
  save();
  render();
}

function findCardById(id) {
  const idStr = String(id);
  for (const c of state.columns) {
    const f = c.cards.find((x) => String(x.id) === idStr);
    if (f) return f;
  }
  return null;
}

// ——— CRUD ———
function addCard(card, colId) {
  const colIdStr = String(colId);
  const col = state.columns.find((c) => String(c.id) === colIdStr) || state.columns[0];
  col.cards.push({ id: uid(), ...card });
  save();
  render();
}
function updateCard(id, updates, newColId) {
  const idStr = String(id);
  const newColIdStr = String(newColId);
  for (const c of state.columns) {
    const idx = c.cards.findIndex((x) => String(x.id) === idStr);
    if (idx > -1) {
      const [card] = c.cards.splice(idx, 1);
      const merged = { ...card, ...updates };
      const target = state.columns.find((cc) => String(cc.id) === newColIdStr) || c;
      target.cards.push(merged);
      save();
      render();
      return;
    }
  }
}
function removeCard(id) {
  if (!confirm("Delete this link?")) return;
  const idStr = String(id);
  for (const c of state.columns) {
    const idx = c.cards.findIndex((x) => String(x.id) === idStr);
    if (idx > -1) {
      c.cards.splice(idx, 1);
      save();
      render();
      return;
    }
  }
}

// ——— Column operations (shared) ———
function deleteColumn(colId, destId, { commit = true, columns = state.columns, deleteCards = false } = {}) {
  // Validation checks with specific error messages
  if (!Array.isArray(columns)) {
    return { success: false, error: "Invalid columns array" };
  }
  if (columns.length <= 1) {
    return { success: false, error: "At least one column is required." };
  }
  
  const colIdStr = String(colId);
  const destIdStr = String(destId);
  const srcIdx = columns.findIndex((c) => String(c.id) === colIdStr);
  if (srcIdx === -1) {
    return { success: false, error: "Source column not found." };
  }
  
  // If not deleting cards, we need a valid destination
  if (!deleteCards) {
    const dest = columns.find((c) => String(c.id) === destIdStr && String(c.id) !== colIdStr) || columns.find((c) => String(c.id) !== colIdStr);
    if (!dest) {
      return { success: false, error: "Destination column not found." };
    }
    
    // Move cards to destination
    const src = columns[srcIdx];
    dest.cards.push(...(src.cards || []));
  }
  // If deleteCards is true, we just don't move the cards - they're deleted with the column
  
  // Delete the column
  columns.splice(srcIdx, 1);
  
  if (commit) {
    save();
    render();
  }
  
  return { success: true };
}
function swapColumns(i, j, columns = state.columns) {
  if (!Array.isArray(columns)) return;
  if (i < 0 || j < 0 || i >= columns.length || j >= columns.length) return;
  const tmp = columns[i];
  columns[i] = columns[j];
  columns[j] = tmp;
}

// ——— Dialog ———
const dlg = document.getElementById("dialog");
const dlgTitle = document.getElementById("dlgTitle");
const fUrl = document.getElementById("fUrl");
const fTitle = document.getElementById("fTitle");
const fNote = document.getElementById("fNote");
const fCol = document.getElementById("fCol");
const dlgDelete = document.getElementById("dlgDelete");

function readDialogData() {
  const raw = (fUrl.value || "").trim();
  if (!raw) {
    alert("Please enter a URL.");
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) && !/^https?:/i.test(raw)) {
    alert("Only HTTP and HTTPS URLs are allowed.");
    return null;
  }
  const normalizedUrl = normalizeUrl(raw);
  if (!normalizedUrl) {
    alert("Please enter a valid URL (http:// or https://).");
    return null;
  }
  return {
    url: normalizedUrl,
    title: fTitle.value.trim(),
    note: fNote.value.trim(),
  };
}

// Helper to populate column dropdown with "Create New" option
function populateColDropdown() {
  fCol.innerHTML = state.columns
    .map((c, i) => `<option value="${escapeAttr(c.id)}">${i + 1}. ${escapeHTML(c.title)}</option>`)
    .join("") + `<option value="__new__">➥ Create New Column...</option>`;
}

// Store the change handler reference globally so we can properly remove it
let currentColChangeHandler = null;
 
function openDialog(card = null, colId = null) {
  ensureColumns();
  populateColDropdown();
  
  // Remove any existing change handler before adding a new one
  if (currentColChangeHandler) {
    fCol.removeEventListener("change", currentColChangeHandler);
    currentColChangeHandler = null;
  }
  
  // Handle "Create New Column" selection
  const handleColChange = () => {
    if (fCol.value === "__new__") {
      // Open the Add Column dialog
      newColName.value = "";
      dlgAddCol.returnValue = "";
      dlgAddCol.showModal();
      requestAnimationFrame(() => newColName.focus());
      
      dlgAddCol.addEventListener("close", function onNewColClose() {
        if (dlgAddCol.returnValue === "cancel") {
          // User cancelled - reset to first column
          fCol.value = state.columns[0]?.id || "";
          return;
        }
        
        const title = newColName.value.trim();
        if (!title) {
          fCol.value = state.columns[0]?.id || "";
          return;
        }
        
        // Create the new column
        const newCol = { id: uid(), title: title, cards: [] };
        state.columns.push(newCol);
        save();
        render(); // Update the main board
        
        // Refresh dropdown and select new column
        populateColDropdown();
        fCol.value = newCol.id; // Auto-select the newly created column
      }, { once: true });
    }
  };
  
  // Store reference and add the listener
  currentColChangeHandler = handleColChange;
  fCol.addEventListener("change", handleColChange);
  
  if (card) {
    dlgTitle.textContent = "Edit Link";
    fUrl.value = card.url;
    fTitle.value = card.title || "";
    fNote.value = card.note || "";
    fCol.value = colId || findColIdByCard(card.id);
    dlgDelete.style.display = "inline-block";
    dlg.returnValue = "";
    dlg.showModal();
    dlg.addEventListener(
      "close",
      function onClose() {
        if (dlg.returnValue === "delete") {
          removeCard(card.id);
          return;
        }
        if (dlg.returnValue === "cancel") return;
        const data = readDialogData();
        if (!data) {
          dlg.returnValue = "";
          dlg.showModal();
          dlg.addEventListener("close", onClose, { once: true });
          requestAnimationFrame(() => fUrl.focus());
          return;
        }
        updateCard(card.id, data, fCol.value);
      },
      { once: true }
    );
  } else {
    dlgTitle.textContent = "Add Link";
    fUrl.value = "";
    fTitle.value = "";
    fNote.value = "";
    fCol.value = colId || state.columns[0].id;
    dlgDelete.style.display = "none";
    dlg.returnValue = "";
    dlg.showModal();
    dlg.addEventListener(
      "close",
      function onClose() {
        if (dlg.returnValue === "cancel") return;
        const data = readDialogData();
        if (!data) {
          dlg.returnValue = "";
          dlg.showModal();
          dlg.addEventListener("close", onClose, { once: true });
          requestAnimationFrame(() => fUrl.focus());
          return;
        }
        if (!data.title) data.title = domainFrom(data.url);
        addCard(data, fCol.value);
      },
      { once: true }
    );
  }
  requestAnimationFrame(() => fUrl.focus());
}

// ——— Export/Import/Reset ———
document.getElementById("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "linkboard.json" });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      
      // Validate structure
      if (!imported || typeof imported !== "object") {
        throw new Error("Invalid data structure");
      }
      if (!Array.isArray(imported.columns)) {
        throw new Error("Missing or invalid 'columns' array");
      }
      
      // Validate each column
      for (const col of imported.columns) {
        if (!col || typeof col !== "object") {
          throw new Error("Invalid column structure");
        }
        if (typeof col.id !== "string" && typeof col.id !== "number") {
          throw new Error("Column missing valid 'id'");
        }
        if (typeof col.title !== "string") {
          throw new Error("Column missing valid 'title'");
        }
        if (!Array.isArray(col.cards)) {
          throw new Error("Column missing 'cards' array");
        }
        
        // Validate each card
        for (const card of col.cards) {
          if (!card || typeof card !== "object") {
            throw new Error("Invalid card structure");
          }
          if (typeof card.id !== "string" && typeof card.id !== "number") {
            throw new Error("Card missing valid 'id'");
          }
          if (typeof card.url !== "string") {
            throw new Error("Card missing valid 'url'");
          }
          // title and note are optional
        }
      }
      
      // All validations passed, accept the import
      if (confirm("Importing will replace your current board. Are you sure?")) {
        if (confirm("This will permanently overwrite your existing data. Proceed?")) {
          state = imported;
          migrateState();
          save();
          render();
          alert("Import successful!");
        }
      }
      e.target.value = ""; // clear input so same file can be selected again
    } catch (err) {
      alert("Import failed: " + (err.message || "Invalid JSON file"));
      e.target.value = "";
    }
  };
  reader.readAsText(file);
});
document.getElementById("btnReset").addEventListener("click", () => {
  if (confirm("Clear all LinkBoard data? This will delete ALL your bookmarks.")) {
    if (confirm("This is permanent. Are you sure?")) {
      const columns = Array.isArray(state.columns) && state.columns.length
        ? state.columns.map((col, idx) => ({
            id: col.id || uid(),
            title: (col.title || "").trim() || `Column ${idx + 1}`,
            cards: [],
          }))
        : createBlankColumns();
      state = { columns };
      save();
      render();
    }
  }
});

// ——— Search & Keyboard ———
searchEl.addEventListener("input", render);
if (searchClearEl) {
  searchClearEl.addEventListener("click", () => {
    searchEl.value = "";
    searchEl.focus();
    render();
  });
}
document.addEventListener("keydown", (e) => {
  // Check if user is typing in an input field
  const inInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  
  // Escape key closes any open dialog
  if (e.key === "Escape") {
    if (dlg.open) {
      dlg.close("cancel");
      e.preventDefault();
    } else if (dlgCols.open) {
      dlgCols.close("cancel");
      e.preventDefault();
    } else if (dlgColDel.open) {
      dlgColDel.close("cancel");
      e.preventDefault();
    } else if (dlgAddCol.open) {
      dlgAddCol.close("cancel");
      e.preventDefault();
    } else if (document.getElementById("dlgBm").open) {
      document.getElementById("dlgBm").close();
      e.preventDefault();
    }
  }
  
  // "/" focuses search (unless typing in an input field or dialog is open)
  if (e.key === "/" && !dlg.open && !inInputField) {
    e.preventDefault();
    searchEl.focus();
  }
  
  // "A" opens add dialog (unless typing in an input field or dialog is open)
  if ((e.key === "a" || e.key === "A") && !dlg.open && !inInputField) {
    e.preventDefault();
    openDialog();
  }
});

// ——— Buttons ———
document.getElementById("btnAdd").addEventListener("click", () => openDialog());
document.getElementById("btnCols").addEventListener("click", () => openColsDialog());

// ——— Column Manager ———
const dlgCols = document.getElementById("dlgCols");
const colsList = document.getElementById("colsList");
const btnAddCol = document.getElementById("btnAddCol");
const dlgColDel = document.getElementById("dlgColDel");
const delDest = document.getElementById("delDest");
const dlgAddCol = document.getElementById("dlgAddCol");
const newColName = document.getElementById("newColName");

let stagedColumns = null;
function getWorkingColumns() {
  return stagedColumns || state.columns;
}
function syncColsInputs() {
  if (!stagedColumns) return;
  colsList.querySelectorAll("input[data-col-id]").forEach((inp) => {
    const colIdStr = String(inp.dataset.colId);
    const col = stagedColumns.find((c) => String(c.id) === colIdStr);
    if (col) {
      col.title = inp.value;
    }
  });
}

function openColsDialog() {
  ensureColumns();
  stagedColumns = state.columns.map((col) => ({
    id: col.id,
    title: col.title,
    originalTitle: col.title,
    cards: [...col.cards],
  }));
  renderColsManager();
  dlgCols.returnValue = "";
  dlgCols.showModal();
  dlgCols.addEventListener(
    "close",
    function onClose() {
      if (dlgCols.returnValue === "cancel") {
        stagedColumns = null;
        return;
      }
      syncColsInputs();
      stagedColumns.forEach((col) => {
        const trimmed = (col.title || "").trim();
        col.title = trimmed || col.originalTitle || "Untitled";
        delete col.originalTitle;
      });
      state.columns = stagedColumns.map((col) => ({ id: col.id, title: col.title, cards: [...col.cards] }));
      stagedColumns = null;
      LinkBoardStorage.saveState(state);
      render();
    },
    { once: true }
  );
}

function renderColsManager() {
  syncColsInputs();
  colsList.innerHTML = "";
  const columns = getWorkingColumns();
  columns.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "colmgr-row";
    
    // OLD (pattern replaced for security - Issue 4):
    // row.innerHTML = `
    //   <div class="order">
    //     <button type="button" class="btn-icon" title="Move up" data-up="${escapeAttr(idx)}">↑</button>
    //     <button type="button" class="btn-icon" title="Move down" data-down="${escapeAttr(idx)}">↓</button>
    //   </div>
    //   <input type="text" data-col-id="${escapeAttr(c.id)}" value="${escapeAttr(c.title)}" />
    //   <div class="colmgr-actions">
    //     <button type="button" class="btn-icon" title="Delete" data-del="${escapeAttr(c.id)}">🗑</button>
    //   </div>`;
    
    // NEW (safe DOM-API version):
    const orderDiv = document.createElement('div');
    orderDiv.className = 'order';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'btn-icon';
    upBtn.title = 'Move up';
    upBtn.setAttribute('data-up', String(idx));
    upBtn.textContent = '↑';

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'btn-icon';
    downBtn.title = 'Move down';
    downBtn.setAttribute('data-down', String(idx));
    downBtn.textContent = '↓';

    orderDiv.append(upBtn, downBtn);

    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('data-col-id', sanitizeId(c.id));
    input.value = c.title;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'colmgr-actions';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-icon';
    delBtn.title = 'Delete';
    delBtn.setAttribute('data-del', sanitizeId(c.id));
    delBtn.textContent = '🗑';

    actionsDiv.appendChild(delBtn);

    row.replaceChildren(orderDiv, input, actionsDiv);

    // Up/Down reorder
    row.querySelector("[data-up]").addEventListener("click", (e) => {
      const i = parseInt(e.currentTarget.getAttribute("data-up"), 10);
      if (i > 0) {
        swapColumns(i, i - 1, columns);
        renderColsManager();
      }
    });
    row.querySelector("[data-down]").addEventListener("click", (e) => {
      const i = parseInt(e.currentTarget.getAttribute("data-down"), 10);
      if (i < columns.length - 1) {
        swapColumns(i, i + 1, columns);
        renderColsManager();
      }
    });

    // Delete with destination select dialog
    row.querySelector("[data-del]").addEventListener("click", () => {
      // Simple validation check
      if (columns.length <= 1) {
        alert("At least one column is required.");
        return;
      }
      
      // Show column info with card count
      const cardCount = c.cards.length;
      const cardText = cardCount === 1 ? "1 card" : `${cardCount} cards`;
      const delColInfo = document.getElementById("delColInfo");
      delColInfo.textContent = `⚠️ Are you sure you want to delete column "${c.title}"? It contains ${cardText}.`;
      
      // Build dest options excluding this column
      // OLD (pattern replaced for security - Issue 5):
      // delDest.innerHTML = columns
      //   .filter((x) => String(x.id) !== String(c.id))
      //   .map((x, i) => `<option value="${escapeAttr(x.id)}">${i + 1}. ${escapeHTML(x.title)}</option>`)
      //   .join("");
      
      // NEW (safe DOM-API version):
      delDest.replaceChildren(); // Clear existing options safely
      columns
        .filter((x) => String(x.id) !== String(c.id))
        .forEach((x, i) => {
          const opt = document.createElement('option');
          opt.value = sanitizeId(x.id);
          opt.textContent = `${i + 1}. ${x.title}`;
          delDest.appendChild(opt);
        });
      
      // Get radio buttons, destination row, and delete button
      const radioDelete = dlgColDel.querySelector('input[name="delAction"][value="delete"]');
      const radioMove = dlgColDel.querySelector('input[name="delAction"][value="move"]');
      const delDestRow = document.getElementById("delDestRow");
      const btnDelColConfirm = document.getElementById("btnDelColConfirm");
      
      // Setup function to initialize dialog state
      const setupDialog = () => {
        // Reset to default state (no selection)
        radioDelete.checked = false;
        radioMove.checked = false;
        delDestRow.style.display = "none";
        
        // Disable delete button and add tooltip
        btnDelColConfirm.disabled = true;
        btnDelColConfirm.title = "Please select an option first";
      };
      
      // Add event listeners to show/hide destination dropdown and enable/disable button
      const handleRadioChange = () => {
        // Use setTimeout to ensure checked state is updated
        setTimeout(() => {
          // Show/hide destination dropdown
          if (radioMove.checked) {
            delDestRow.style.display = "grid";
          } else {
            delDestRow.style.display = "none";
          }
          
          // Enable/disable delete button and update tooltip
          if (radioDelete.checked || radioMove.checked) {
            btnDelColConfirm.disabled = false;
            btnDelColConfirm.title = "";
          } else {
            btnDelColConfirm.disabled = true;
            btnDelColConfirm.title = "Please select an option first";
          }
        }, 0);
      };
      
      // Remove any existing listeners to avoid duplicates
      radioDelete.removeEventListener("change", handleRadioChange);
      radioMove.removeEventListener("change", handleRadioChange);
      radioDelete.removeEventListener("click", handleRadioChange);
      radioMove.removeEventListener("click", handleRadioChange);
      radioDelete.removeEventListener("input", handleRadioChange);
      radioMove.removeEventListener("input", handleRadioChange);
      
      // Add fresh event listeners (change, click, and input for maximum reliability)
      radioDelete.addEventListener("change", handleRadioChange);
      radioMove.addEventListener("change", handleRadioChange);
      radioDelete.addEventListener("click", handleRadioChange);
      radioMove.addEventListener("click", handleRadioChange);
      radioDelete.addEventListener("input", handleRadioChange);
      radioMove.addEventListener("input", handleRadioChange);
      
      setupDialog();
      dlgColDel.returnValue = "";
      dlgColDel.showModal();
      dlgColDel.addEventListener(
        "close",
        function onClose() {
          if (dlgColDel.returnValue === "cancel") return;
          
          // No need to validate - button is disabled if no selection
          // Check which action was selected
          const shouldDeleteCards = radioDelete.checked;
          const destId = delDest.value;
          
          const result = deleteColumn(c.id, destId, { 
            commit: false, 
            columns,
            deleteCards: shouldDeleteCards
          });
          
          if (!result.success) {
            alert(result.error);
            return;
          }
          renderColsManager();
        },
        { once: true }
      );
    });

    colsList.appendChild(row);
  });
}

btnAddCol.addEventListener("click", () => {
  newColName.value = "";
  dlgAddCol.returnValue = "";
  dlgAddCol.showModal();
  requestAnimationFrame(() => newColName.focus());
  
  dlgAddCol.addEventListener(
    "close",
    function onClose() {
      if (dlgAddCol.returnValue === "cancel") return;
      
      const title = newColName.value.trim();
      if (!title) {
        // Re-open dialog if empty
        dlgAddCol.returnValue = "";
        dlgAddCol.showModal();
        dlgAddCol.addEventListener("close", onClose, { once: true });
        requestAnimationFrame(() => newColName.focus());
        return;
      }
      
      if (!stagedColumns) {
        stagedColumns = state.columns.map((col) => ({
          id: col.id,
          title: col.title,
          originalTitle: col.title,
          cards: [...col.cards],
        }));
      }
      syncColsInputs();
      stagedColumns.push({ id: uid(), title: title, originalTitle: title, cards: [] });
      renderColsManager();
    },
    { once: true }
  );
});

// Bookmarklet support
const bmDlg = document.getElementById("dlgBm");
document.getElementById("btnBookmarklet").addEventListener("click", () => {
  const here = location.href.split("#")[0];
  // Build the bookmarklet JavaScript code - uses location.href to avoid popup blockers
  const js = `javascript:(function(){var u=encodeURIComponent(location.href),t=encodeURIComponent(document.title);location.href="${here}?add="+u+"&title="+t;})();`;
  const link = document.getElementById("bmLink");
  link.textContent = "Add to LinkBoard";
  link.href = js;
  bmDlg.showModal();
});

// On-load: check for ?add= URL param from bookmarklet
(function initFromParams() {
  const p = new URLSearchParams(location.search);
  const add = p.get("add");
  if (!add) return;

  // URLSearchParams.get() already decodes URI components, so no need for decodeURIComponent()
  const rawTitle = (p.get("title") || "").trim();

  // Validate the URL before processing
  const normalizedUrl = normalizeUrl(add);
  if (!normalizedUrl) {
    alert("Invalid URL from bookmarklet: " + add);
    return;
  }

  let finalTitle = rawTitle;
  let finalNote = "";

  try {
    const host = new URL(normalizedUrl).hostname.replace(/^www\./, "").toLowerCase();
    const isTweetHost =
      host === "x.com" ||
      host === "twitter.com" ||
      host === "mobile.twitter.com" ||
      host.endsWith(".x.com") ||
      host.endsWith(".twitter.com");

    if (isTweetHost && rawTitle) {
      const text = rawTitle;
      finalTitle = text.length > 80 ? `${text.slice(0, 80)}...` : text;
      finalNote = text.length > 340 ? text.slice(0, 340) : text;
    }
  } catch {
    // If URL parsing fails, just fall back to rawTitle
  }

  // Open dialog in add mode and pre-populate fields
  openDialog(null, null);
  requestAnimationFrame(() => {
    fUrl.value = normalizedUrl;
    fTitle.value = finalTitle;
    if (finalNote && typeof fNote !== "undefined" && fNote) {
      fNote.value = finalNote;
    }
  });

  history.replaceState({}, "", location.pathname); // clean URL
})();

// ——— Bootstrap ———
render();
 
// Hide loading indicator after initial render
requestAnimationFrame(() => {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('loaded');
    // Remove from DOM after transition completes
    setTimeout(() => loadingEl.remove(), 300);
  }
});

// ——— Helpers ———
function escapeHTML(str) {
  return (str || "").replace(
    /[&<>"']/g,
    (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
  );
}
function sanitizeId(value) {
  // Convert to string, limit length, allow only safe characters
  return String(value ?? '')
    .slice(0, 128)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}
function escapeAttr(value) {
  // Escape for HTML attribute context
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


