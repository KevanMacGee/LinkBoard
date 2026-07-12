# LinkBoard AI Context

**Purpose:** Context for AI-assisted code reviews, security reviews, architecture discussions, and future development work.

**Context reviewed:** July 12, 2026

This document is intentionally a context document, not a complete roadmap. The live code is more reliable than older status and roadmap documents in this repository.

## Product context

LinkBoard started as a personal tool for collecting and organizing links in a kanban-style board. The owner is actively using it for personal link storage today.

The project also has a possible future SaaS direction. That direction is real, but it is not the immediate reason the app exists. The current product should be understood as both:

1. A usable one-user personal tool.
2. An early foundation for a future multi-user hosted product.

The original idea included a fully local, privacy-focused version. That privacy angle is no longer an active requirement. It may be revisited later if there is a clear need, but there is currently no obvious need to preserve a separate local-only distribution mode.

When reviewing the project, do not treat the old local-only mode as a required feature. In particular, do not recommend completing the inline-builder path merely because it exists. The inline builder and its generated distribution are likely legacy cleanup candidates.

## Current implementation status

The core browser app is functional and includes:

- Columns and cards for organizing links.
- Adding, editing, deleting, and moving cards.
- Drag-and-drop ordering using SortableJS.
- Search/filtering.
- Light/dark theme switching.
- Column creation, renaming, reordering, and deletion.
- JSON import, export, and reset flows.
- Bookmarklet support when the app is served over HTTP.

The main application source is under `app/`, especially:

- `app/index.html`
- `app/app.js`
- `app/styles.css`
- `app/storage.local.js`
- `app/storage.supabase.js`
- `app/supabaseClient.js`

The repository is best described as a late prototype or early beta, rather than a finished SaaS product.

## Current storage architecture

The app now has a partial Supabase integration. It is not still a purely localStorage-only application.

The runtime flow is approximately:

1. The app starts and attempts to load a fixed board from Supabase.
2. If remote data exists, that data is loaded into the app.
3. If the remote board is empty, the app loads localStorage data and seeds Supabase from it.
4. The app writes localStorage on every save.
5. While remote persistence is enabled, changes are also queued and sent to Supabase.
6. If Supabase fails, the app disables remote persistence for the rest of that session and continues using local data.

This is a reasonable personal-tool arrangement: Supabase provides durable cross-device storage, while localStorage provides a fallback and supports older local data. It is not yet a robust synchronization system. There is no user-facing sync indicator, automatic retry after a failed remote save, conflict resolution, or offline queue that survives a browser restart.

Relevant code:

- `app/app.js` contains local persistence, remote bootstrap, fallback handling, and save queuing.
- `app/storage.supabase.js` performs the Supabase reads, upserts, and deletes.
- `app/supabaseClient.js` creates the Supabase client and currently contains fixed development identifiers.

The publishable Supabase key being present in browser code is not automatically a secret-management flaw; publishable client keys are designed for browser use. The important security question is whether authentication, ownership checks, and Row Level Security are correctly configured in Supabase. The repository does not contain migrations or RLS policies, so those database-side settings cannot be confirmed from code alone.

## Important current limitation: development-only ownership

The Supabase layer currently uses hard-coded values named `DEV_OWNER_ID` and `DEV_BOARD_ID`.

There is currently no:

- Signup or login flow.
- Supabase Auth session handling.
- Per-user owner identity.
- Per-user board lookup.
- Protected app access.
- Verified ownership enforcement in the repository.

Therefore, this is not yet a production-ready multi-user data model. If database policies permit anonymous access, different users could potentially read or mutate the same fixed board. If policies deny access, the app will generally fall back to localStorage instead.

For the current personal use case, the fixed development board may be acceptable as a temporary arrangement. It should not be mistaken for completed SaaS account isolation.

## Local-only builder and distribution status

The project contains an older inline/static distribution path:

- `scripts/inline-builder.js`
- `dist/linkboard-inline.html`
- The `build:inline` and `watch:inline` npm scripts.

This path was created to support a fully local, self-contained version of the app. That privacy/local-only requirement is no longer a current product priority.

The generated `dist/linkboard-inline.html` is stale and is localStorage-only; it does not contain the current Supabase integration. The current builder also only inlines the local storage module and does not properly package the Supabase bridge or its client module.

Unless another deployment or workflow is found that depends on it, the inline builder, generated `dist` artifact, and related documentation should be considered candidates for removal or archival. Future reviews should focus on whether anything still references them, not on completing the builder as a primary feature.

Do not confuse this with removing localStorage entirely. `storage.local.js` and localStorage may still be useful for fallback persistence, migration, theme preferences, last-column preference, and import compatibility.

## SaaS direction and unfinished work

The future SaaS direction may eventually include:

- User accounts and authentication.
- User-owned boards and data.
- Multiple boards.
- Free and paid tiers.
- Billing or subscription management.
- Server/database-enforced usage limits.

Those features are not currently implemented. There is no evidence in the live app of completed billing, account management, tier enforcement, or multi-user support.

Do not evaluate the current personal tool as though all SaaS features were expected to be complete already. At the same time, when reviewing security or data ownership, do not treat the current fixed-ID approach as sufficient for a public SaaS launch.

## Review priorities for future AI work

When asked to review, diagnose, or improve this project:

1. Treat `app/` source code as the canonical product implementation.
2. Use the live code as the primary source of truth; older Markdown status and roadmap files may predate the Supabase work.
3. Preserve the current personal-tool use case unless the user explicitly asks for a product redesign.
4. Treat Supabase-backed persistence with localStorage fallback as the current intended direction.
5. Treat the inline builder and stale `dist` output as likely cleanup work, not unfinished core functionality.
6. Do not recommend restoring a fully local privacy mode without a specific user need.
7. For security reviews, investigate Supabase Auth, RLS, anonymous access, fixed IDs, data ownership, and error/fallback behavior.
8. For reliability reviews, investigate failed saves, stale local data, remote/local precedence, retry behavior, and cross-device consistency.
9. For SaaS reviews, clearly separate what is acceptable for one personal user from what would be required before public multi-user use.
10. Keep export/import as a useful backup and migration feature even if the inline builder is removed.

## Current practical next steps

The most useful near-term work is likely:

1. Verify the actual Supabase schema and RLS policies.
2. Improve sync failure visibility and retry behavior for personal use.
3. Update UI copy that still says the app saves only to localStorage.
4. Confirm whether anything depends on the inline builder or `dist`.
5. Remove or archive the obsolete inline-only path if no dependency is found.
6. Add Auth and replace fixed owner/board identifiers only when the SaaS direction becomes active.

This ordering reflects the current reality: make the personal Supabase-backed tool dependable first, then add multi-user SaaS infrastructure when it is actually needed.
