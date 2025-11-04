
You are refactoring a single-file HTML app (LinkBoard) into separate CSS and JS files while preserving behavior.

Context:
- I already have a single `index.html` with:
  - One large `<style>...</style>` block in the head
  - One large inline `<script>...</script>` block at the very end of body, after the SortableJS CDN script
- I want to:
  1) Move CSS into `styles.css`
  2) Move most JS into `app.js`
  3) Move ONLY the localStorage helper functions into `storage.local.js`
- IMPORTANT: For this first refactor, I want to KEEP the main `state` variable and its initialization in `app.js`. Do **NOT** move `state` into `storage.local.js`. Do **NOT** introduce `getState` / `setState` yet.

No build tooling, no login, no backend, no behavior changes.

---

## Step 1: Extract CSS to styles.css

1. In `index.html`, locate the single `<style>...</style>` block in the `<head>`.
2. Copy all CSS inside that block into a new file named `styles.css` (same folder as `index.html`).
3. Remove the `<style>...</style>` block from `index.html` and replace it with:
   ```html
   <link rel="stylesheet" href="styles.css" />

1. Do not change anything else in the `<head>`.

------

## Step 2: Extract main JS to app.js

1. At the very end of `<body>` there is:

   - A `<script src="https://cdn.jsdelivr.net/npm/sortablejs@..."></script>` tag
   - Followed by a large inline `<script>...</script>` that begins with the theme logic (e.g. `// ——— Theme ———`) and ends with helpers like `escapeHTML`, `sanitizeId`, `escapeAttr`.

2. Create a new file named `app.js`.

3. Move the *entire contents* of that inline `<script>...</script>` into `app.js`.

4. In `index.html`, replace that inline script tag with:

   ```
   <script src="storage.local.js"></script>
   <script src="app.js"></script>
   ```

5. The final script order at the bottom of `index.html` (inside `<body>`) should be:

   ```
   <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
   <script src="storage.local.js"></script>
   <script src="app.js"></script>
   ```

6. Do not alter the SortableJS CDN script tag.

------

## Step 3: Create storage.local.js (helpers ONLY, not state)

Now we start isolating the storage logic, but we keep `state` in `app.js` for now.

1. Identify the following pieces in the original JS (now in `app.js`):

   - `const STORAGE_KEY = "linkboard.v1";`
   - `const INITIAL_COLUMN_COUNT = 4;`
   - `function createBlankColumns(...)`
   - `function createInitialState(...)`
   - `function load(...)`
   - `function save(...)`
   - `function ensureColumns(...)`
   - `function migrateState(...)`

   **Do NOT include the `let state = ...` initialization block in this list.**

2. Create a new file named `storage.local.js`.

3. Move the **definitions** of the items above into `storage.local.js` and wrap them in an IIFE that exposes a `window.LinkBoardStorage` object, like this:

   ```
   (function () {
     const STORAGE_KEY = "linkboard.v1";
     const INITIAL_COLUMN_COUNT = 4;
   
     function createBlankColumns(count = INITIAL_COLUMN_COUNT) {
       // ...original body...
     }
   
     function createInitialState() {
       // ...original body...
     }
   
     function load() {
       // ...original body...
     }
   
     function save(state) {
       // If original save() read from a global state, you can keep the same signature,
       // but prefer a function that takes state as an argument if it is easy.
       // The key point: behavior must NOT change.
     }
   
     function ensureColumns(state) {
       // ...original body (if applicable)...
     }
   
     function migrateState(state) {
       // ...original body...
     }
   
     window.LinkBoardStorage = {
       STORAGE_KEY,
       INITIAL_COLUMN_COUNT,
       createBlankColumns,
       createInitialState,
       load,
       save,
       ensureColumns,
       migrateState,
     };
   })();
   ```

   Keep the function bodies identical to the original versions. Do NOT change the localStorage key or the structure of the stored data.

4. **Do NOT** move the `let state = load(); if (!state) state = createInitialState(); migrateState(...); save(...);` block into `storage.local.js`. That stays in `app.js`.

------

## Step 4: Update app.js to use LinkBoardStorage, but keep `state` here

1. At the top of `app.js` (after any `"use strict";` if present), pull the helpers from `window.LinkBoardStorage`:

   ```
   const {
     STORAGE_KEY,
     INITIAL_COLUMN_COUNT,
     createBlankColumns,
     createInitialState,
     load,
     save,
     ensureColumns,
     migrateState,
   } = window.LinkBoardStorage;
   ```

2. Ensure that `state` is defined and initialized in `app.js` using these functions, similar to how it was originally:

   ```
   let state = load();
   if (!state) state = createInitialState();
   migrateState(state);
   ensureColumns(state); // if this existed before
   save(state);
   ```

   Use the same logic the original code used; just call the moved functions through these variables instead of having their definitions in `app.js`.

3. Everywhere else in `app.js`:

   - Continue using the `state` variable as before.
   - Continue calling `save(state)` where the original code called `save()` or `save(state)`.
   - Do NOT introduce `getState()` / `setState()` at this time.
   - Do NOT introduce a second copy of `state` inside `storage.local.js`.

   The important invariant: there is a single authoritative `state` variable in `app.js`, and `storage.local.js` only provides helper functions.

4. Do not change any user-facing behavior, DOM structure, or class names. The only changes should be:

   - CSS moved to `styles.css`
   - Storage helper functions moved to `storage.local.js`
   - `app.js` updated to import those helpers from `window.LinkBoardStorage`.

------

## Step 5: Sanity check

After all changes:

1. `index.html`:

   - Uses `<link rel="stylesheet" href="styles.css" />`

   - Has the scripts at the bottom in this order:

     ```
     <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
     <script src="storage.local.js"></script>
     <script src="app.js"></script>
     ```

2. Opening `index.html` directly in the browser (file://) should:

   - Render the same UI as before.
   - Use the same `linkboard.v1` key in localStorage with the same shape.
   - Keep all existing behavior identical:
     - add/edit/delete cards
     - drag & drop between columns
     - column management
     - export/import
     - reset
     - theme toggle
     - keyboard shortcuts
     - bookmarklet behavior

Please now perform this refactor on `index.html`, creating `styles.css`, `storage.local.js`, and updating `app.js` as described above. Do not introduce any new patterns beyond what is specified here.