Let me dig deeper into the key files. 

Read [](file:///c%3A/Users/User/Development/linkboard/app/storage.supabase.js#200-200), lines 200 to 260

Read [](file:///c%3A/Users/User/Development/linkboard/app/app.js#200-200), lines 200 to 350

Read [](file:///c%3A/Users/User/Development/linkboard/app/app.js#350-350), lines 350 to 500

Read [](file:///c%3A/Users/User/Development/linkboard/scripts/inline-builder.js#80-80), lines 80 to 162

Read [](file:///c%3A/Users/User/Development/linkboard/app/app.js#500-500), lines 500 to 700

Read [](file:///c%3A/Users/User/Development/linkboard/app/app.js#700-700), lines 700 to 900

Read [](file:///c%3A/Users/User/Development/linkboard/app/app.js#900-900), lines 900 to 1100

Read [](file:///c%3A/Users/User/Development/linkboard/app/app.js#1100-1100), lines 1100 to 1332

Read [](file:///c%3A/Users/User/Development/linkboard/package.json)

Read [](file:///c%3A/Users/User/Development/linkboard/app/landing-index.html)

Now I have a comprehensive picture. Here's the detailed breakdown:

---

## LinkBoard — Detailed Project Status

### 🏗️ Architecture Overview

The app is a **vanilla JS, no-build, no-framework** single-page app. Three scripts load in order:

1. **storage.local.js** — Pure localStorage API (`LinkBoardStorage`)
2. **storage.supabase.js** — Supabase cloud persistence (`LinkBoardSupabase`)
3. **app.js** — The entire UI, CRUD, dialogs, rendering, drag-drop (~1350 lines)

### 💾 Storage Layer — How It Actually Works

**The bootstrap sequence (`bootstrapState` in app.js):**

1. If `LinkBoardSupabase` doesn't exist → fall back to local-only
2. Try `supabase.loadState()` → fetches boards, columns, and cards from Supabase
3. **If Supabase returns data** → use it, set `remotePersistenceEnabled = true`
4. **If Supabase is empty** → take local data, call it "seed", push it to Supabase, enable remote
5. **If Supabase errors** → fall back to local, set `remotePersistenceEnabled = false`

**On every save (`persistState`):**

- Saves to `localStorage` immediately (always)
- If remote is enabled, queues an async push to Supabase
- If that push fails, disables remote for the rest of the session (doesn't break anything)

This is well-designed. The local-first with cloud sync pattern is solid.

### 🔑 Supabase Details

- **Client**: `supabase-js@2` loaded via esm.sh CDN
- **Config**: Hardcoded in supabaseClient.js — URL, anon key, and two dev constants:
  - `DEV_OWNER_ID`: `00000000-0000-0000-0000-000000000001`
  - `DEV_BOARD_ID`: `00000000-0000-0000-0000-000000000101`
- **Tables used**: `boards`, `columns`, `cards` (three-table schema)
- **Save logic**: Full sync on every change — upserts all columns/cards, deletes any that were removed. This is a "replace all" strategy, not granular diffs.
- **No auth**: No `supabase.auth` calls anywhere. Everyone hits the same board.
- **ID handling**: Local IDs are random alphanumeric strings (e.g. `col_abc123`). Supabase needs UUIDs, so storage.supabase.js has a `client_id` column mapping local IDs ↔ database UUIDs. When saving, if a local ID isn't already mapped, it generates a new UUID.

### 🧹 Inline Builder — Definitely a Prune Candidate

**inline-builder.js** does:

- Reads `index.html`, `styles.css`, app.js, storage.local.js
- Inlines CSS into a `<style>` tag, JS into a `<script>` tag
- Outputs a single linkboard-inline.html

**Problems:**

- It **only handles storage.local.js** — it strips that script tag and inlines it alongside app.js, but it completely ignores storage.supabase.js and supabaseClient.js. The built output would have **no Supabase support at all**.
- The regex patterns (`STORAGE_SCRIPT_TAG_REGEX`, `SCRIPT_TAG_REGEX`) only match the exact filenames they know about.
- It has no awareness of supabaseClient.js (the ES module import).

If you ran `npm run build:inline` today, you'd get a broken output that can't connect to Supabase.

### 🖥️ UI Features — All Working

Based on the code, here's everything the app does:

| Feature                           | Status | Notes                                                                     |
| --------------------------------- | ------ | ------------------------------------------------------------------------- |
| Column board with cards           | ✅      | Renders from state, drag-drop via SortableJS CDN                          |
| Add/Edit links                    | ✅      | Dialog with URL, title, note, column selector                             |
| Column management                 | ✅      | Add, rename, reorder, delete (with card-move or card-delete option)       |
| Search/filter                     | ✅      | Real-time filter on title, domain, note. Disables drag while active.      |
| Dark/light theme                  | ✅      | Toggles via `data-theme` attribute, persists in localStorage              |
| Export to JSON                    | ✅      | Downloads timestamped `.json` file                                        |
| Import from JSON                  | ✅      | Double-confirmation, validates structure, overwrites state                |
| Reset all data                    | ✅      | Double `confirm()` prompt                                                 |
| Bookmarklet                       | ✅      | Generates `javascript:` URL, reads `?add=` + `?title=` URL params on load |
| "Create New Column" in add dialog | ✅      | Dropdown option that opens the add-column sub-dialog                      |
| Remember last used column         | ✅      | Stores in `linkboard.lastColumn` localStorage key                         |
| Loading spinner                   | ✅      | Shows during bootstrap, fades out after first render                      |

### 📄 Landing Page

landing-index.html exists with a simple hero section, a screenshot, and a link to the main app. It shares `styles.css` and adds `landing.css`. This is very basic — no signup, no login, just a marketing-style page.

### 🗂️ Project Structure — What's What

| Path                    | Purpose                                            | Keep?                     |
| ----------------------- | -------------------------------------------------- | ------------------------- |
| app                     | Main app directory                                 | ✅                         |
| app.js                  | Core app logic (~1350 lines)                       | ✅                         |
| storage.local.js        | localStorage layer                                 | ✅                         |
| storage.supabase.js     | Supabase sync layer                                | ✅                         |
| supabaseClient.js       | Supabase client init + hardcoded IDs               | ✅ (needs auth eventually) |
| styles.css              | All styles                                         | ✅                         |
| landing-index.html      | Landing/marketing page                             | ✅                         |
| landing.css             | Landing page styles                                | ✅                         |
| inline-builder.js       | Build tool for single-file output                  | 🧹 Prune                  |
| inline-builder-guide.md | Docs for the builder                               | 🧹 Prune                  |
| package.json            | Only has `build:inline` and `watch:inline` scripts | ⚠️ Stale after pruning    |
| _archive                | Old docs, summaries, exports                       | Already gitignored        |

### 🚨 Important Notes

1. **Your Supabase anon key is in supabaseClient.js** — this is committed to the repo. Supabase anon keys are designed to be public (they're protected by Row Level Security policies), but since you have no RLS set up (no auth = no RLS), **anyone with this URL could read/write your data**. For a personal tool, this is probably fine. For SaaS, this is the #1 thing to fix.

2. **The `migrateState` function exists in three places**: storage.local.js, storage.supabase.js (which delegates to storage.local.js), and app.js (which is its own copy). The Supabase layer correctly delegates, but app.js has a duplicate copy rather than using `LinkBoardStorage.migrateState()`. Not a bug, just messy.

3. **The `uid()` function is also duplicated** — exists in both storage.local.js and app.js with identical implementations.

### Summary

You're in a good spot for personal use. The core app is feature-complete for a single user. The Supabase sync works and degrades gracefully. The main cleanup is removing the inline builder (which is broken relative to the current architecture anyway) and its associated docs/scripts. The big SaaS leap — auth, multi-user, RLS — is untouched.
