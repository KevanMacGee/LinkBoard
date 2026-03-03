# LinkBoard Project Rundown (March 2, 2026)

## Audit scope
- Reviewed files returned by `git ls-files --cached --others --exclude-standard`.
- Excluded folders listed in `.gitignore`: `ignore/`, `variants/`, `.specstory/`, `_archive/`, `docs/`.

## Where the project is now

### Product stage
- Current state is a late prototype/early beta, consistent with `README.md`.
- The core single-user bookmark board is functional as a browser app.

### Implemented functionality
- Link board with columns and cards (add/edit/delete).
- Drag and drop between columns (SortableJS).
- Search/filter by title/domain/note.
- Theme toggle (light/dark).
- Column manager modal (rename, reorder, add, delete with move/delete card options).
- JSON export/import/reset flows, including import validation.
- Bookmarklet flow that opens LinkBoard and pre-fills a link via URL params.
- Inline build pipeline that generates `dist/linkboard-inline.html`.

### Current architecture
- Frontend-only static app (`app/index.html`, `app/app.js`, `app/styles.css`).
- Storage is browser `localStorage` (`linkboard.v1`) with migration/cleanup logic.
- No backend API, no database, no user auth/account system, no billing provider integration.
- There is duplicated storage logic between `app/app.js` and `app/storage.local.js` (one save path in `app.js` calls `LinkBoardStorage.saveState` directly).

### Draft/partial areas
- Landing page is an early static draft (`app/landing-index.html`, `app/landing.css`) and not wired to product logic, auth, or billing.
- Landing hero image path appears to be placeholder/broken relative to current folder structure (`app/landing-index.html` points to `../screenshots/...`).

### Quick validation run
- `npm run build:inline` completes successfully.

## Gap analysis against your stated next goals

### 1) Add new users
Current status: not started.

Missing:
- User model and account lifecycle (signup/login/logout/password reset/email verification as needed).
- Auth/session infrastructure.
- Per-user data ownership and access control.
- Migration path from local-only data to account-owned data.

### 2) Add payment method
Current status: not started.

Missing:
- Billing provider integration (for example, Stripe).
- Customer creation and payment method capture flow.
- Webhook handling for billing/subscription events.
- Billing management UI (update card/cancel/manage plan).

### 3) Add free and paid tiers with lower free usage
Current status: not started.

Missing:
- Plan definitions and concrete limits.
- Usage tracking (durable counters/metrics per user).
- Server-side enforcement of limits.
- Upgrade gating and limit messaging in UI.

## Recommended build order (what should be done next)

1. Lock architecture decisions first.
- Choose auth, backend, database, and billing stack before coding feature slices.
- Output: one short architecture decision doc with schema + env vars + deployment target.

2. Stand up backend + auth foundation.
- Add user accounts and authenticated sessions.
- Create user-owned data models (`users`, `boards`, `columns`, `cards` or equivalent).
- Port CRUD from localStorage to authenticated API/database.

3. Implement billing primitives.
- Create customer records on account creation.
- Add payment method flow and billing portal.
- Add webhook endpoint to sync subscription status.

4. Implement tier logic and usage enforcement.
- Define free-tier limits (for example: max cards/boards/actions per period).
- Track usage per user.
- Enforce limits server-side; UI only reflects server decisions.

5. Add migration/import path for existing users.
- One-time import from localStorage JSON into authenticated account.
- Keep export/import as backup tooling.

6. Finish landing page once account + billing flows are real.
- Wire CTAs to signup/login/upgrade.
- Add pricing content tied to real plan config.
- Keep visual polish as a secondary pass, as requested.

## Suggested immediate backlog (next 1-2 weeks)
- [ ] Choose stack and write architecture decision notes.
- [ ] Create initial backend project structure and database schema.
- [ ] Implement signup/login/logout and protected app access.
- [ ] Port board/column/card CRUD to backend for authenticated users.
- [ ] Integrate payment method collection in test mode.
- [ ] Add free-tier usage limits and upgrade gate.
- [ ] Add baseline integration tests for auth + tier enforcement.

## Key risks to watch
- Duplicated storage logic (`app.js` vs `storage.local.js`) can drift during migration.
- If tier limits are enforced only in frontend, they are bypassable.
- Data migration quality matters: users must not lose existing local boards during account conversion.

## Definition of done for this phase
- A new user can create an account and sign in.
- A signed-in user can add and manage a payment method.
- Free-tier limits are enforced reliably.
- Paid tier upgrades remove/raise those limits.
- Existing local data can be imported into the user account.
