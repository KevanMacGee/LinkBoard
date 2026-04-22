# LinkBoard SaaS Migration Plan Review

Date: 2026-04-21

## Scope

I reviewed the non-ignored project files surfaced by `git ls-files --cached --others --exclude-standard`, including the revised Supabase plan, `README.md`, `PROJECT_RUNDOWN.md`, `PROJECT_STATUS_AND_ROADMAP.md`, `package.json`, `app/index.html`, `app/app.js`, `app/storage.local.js`, the sample JSON data files, and `scripts/inline-builder.js`.

I did not inspect ignored archive/scrap folders such as `ignore/`, `variants/`, `.specstory/`, `_archive/`, or `docs/`.

## Executive Verdict

The revised plan is a useful personal-prototype migration outline, but it is not safe or complete enough for a public SaaS migration if followed literally.

The biggest problem is the recommendation to add auth later. That is acceptable only for a throwaway local Supabase experiment. For a public app, user identity, row-level security, data ownership, and billing enforcement are foundational. If the app writes real user data to Supabase before those pieces exist, you either have no safe per-user isolation or you will need to redo the schema and data access layer almost immediately.

The safer path is:

1. Define the SaaS data ownership model first.
2. Create Supabase migrations with RLS policies from day one.
3. Refactor the current synchronous localStorage persistence behind an async repository boundary.
4. Add Supabase Auth before replacing production persistence.
5. Move card/column operations to Supabase with transactional reorder/delete behavior.
6. Add Stripe billing and server-side quota enforcement before launch.

## Current App Facts That Matter

- The app is currently a static frontend: `app/index.html`, `app/app.js`, and `app/styles.css`.
- The only app persistence is browser `localStorage` under `linkboard.v1` in `app/app.js:32`, `app/app.js:57`, and `app/app.js:64`.
- There is duplicated storage logic in `app/storage.local.js`, and at least one path bypasses the local `save()` function by calling `LinkBoardStorage.saveState(state)` directly in `app/app.js:908`.
- The current data model is one nested board-like object: `{ columns: [{ id, title, cards: [...] }] }`. There is no real multi-board UI yet.
- Core mutations are synchronous and assume local writes cannot partially fail: card reorder at `app/app.js:370`, add/update/delete card at `app/app.js:401`, `app/app.js:408`, and `app/app.js:425`, and delete column at `app/app.js:440`.
- Export/import/reset remain local JSON features in `app/app.js:688`, `app/app.js:701`, and `app/app.js:786`.
- The UI still tells users everything saves to localStorage in `app/index.html:56`.
- The sample reset data has 5 columns and 29 cards; the stress data has 16 columns and 128 cards.
- `package.json` has no real test command yet.

These facts make the migration less about "replace localStorage with Supabase calls" and more about changing a synchronous single-user app into an async, authenticated, multi-tenant app.

## What The Draft Plan Gets Right

- Supabase is a reasonable fit for this product if you want Postgres, auth, and simple client-side data access.
- A database access layer is the right instinct. Supabase calls should not be scattered through UI event handlers.
- Ordering, drag/drop persistence, deletes, stale UI, and partial failures are correctly identified as dangerous areas.
- Keeping local UI state while moving durable persistence to the database is the right separation.
- Keeping export/import as a user-controlled backup path is still valuable.

## Main Problems In The Draft Plan

### 1. "Add basic auth later" is the wrong sequence for SaaS

This is the biggest issue.

Supabase's browser client is designed around public client keys plus Postgres Row Level Security. RLS policies normally use `auth.uid()` to decide which rows a user can access. Without auth, you cannot correctly isolate user data. A DB-backed version without auth is fine as a private development spike, but it should not become the production migration path.

Recommended correction: add Supabase Auth and ownership columns before production data moves to Supabase.

### 2. The schema is not actually settled

The draft says "the schema is already settled," but the document does not include a concrete schema. The current app has only columns and cards in one root state object. The plan talks about boards, columns, and cards, but the product does not yet expose multiple boards.

Recommended correction: explicitly decide whether launch has:

- one default board per user, with a `boards` table for future expansion; or
- no `boards` table yet, only user-owned columns/cards.

My recommendation is to include `boards` now but launch with one default board per user. That avoids another migration later while keeping the current UI simple.

### 3. RLS policies are missing

For a browser-accessed Supabase app, RLS is not optional. Every exposed table containing user data needs RLS enabled and policies tested for:

- unauthenticated users cannot read or write data;
- user A cannot read or write user B's data;
- inserts cannot spoof another user's `owner_id`;
- updates cannot move rows into another user's board or column.

The draft mentions keys but not RLS. That is not enough for public launch.

### 4. Key handling needs updating

The draft mentions project URL, anon key, and service role key. For a new hosted Supabase project, prefer the current publishable/secret key model where available. A public/publishable key can be in the browser. A secret or service-role key must never be used in browser code, local static HTML, bundled frontend files, query params, or public docs.

### 5. The plan skips migrations and environments

"Create the tables" should not mean hand-clicking a production schema into existence. Use Supabase CLI migrations so schema, RLS, triggers, and functions are versioned in the repo.

Recommended correction:

- add `supabase/migrations/*.sql`;
- test locally with `supabase db reset`;
- push migrations to staging first;
- keep production, staging, and local env vars separate.

### 6. The data layer needs to be async from the start

Current operations mutate `state`, call `save()`, and immediately re-render. Supabase writes are async, can fail, and can partially succeed if modeled as multiple independent calls.

The database layer should not be a thin "save this whole state blob" wrapper. It should expose operations that match domain actions:

- `loadDefaultBoard()`
- `createCard()`
- `updateCard()`
- `deleteCard()`
- `moveCard()`
- `reorderCards()`
- `createColumn()`
- `renameColumn()`
- `reorderColumns()`
- `deleteColumnAndMoveCards()`
- `deleteColumnAndCards()`
- `importBoardJson()`

The UI then needs explicit loading, pending, error, rollback, and refresh behavior.

### 7. Ordering needs a real database strategy

The current array order is implicit. In Postgres it must be explicit.

Use `position` fields on columns and cards. For this app's expected scale, integer positions are probably enough if reorder operations rewrite the affected column/board positions inside a transaction. Avoid making drag/drop issue many independent client updates without a transaction.

Recommended correction: implement reorder and move operations as Postgres RPC functions or Edge Function calls so the order update is atomic.

### 8. Column delete/move must be transactional

The current delete-column flow can either delete cards or move them to another column. In the database this must be one atomic operation:

- validate the user owns the board;
- validate at least one column remains;
- move cards if requested;
- delete the source column;
- normalize positions.

Do not implement this as several unrelated browser calls.

### 9. Current IDs should not become production primary keys

Current IDs are short random strings created with `Math.random()`. They are acceptable for local JSON but not ideal for multi-tenant production rows.

Recommended correction:

- use database UUID primary keys, ideally generated by Postgres;
- during JSON import, map legacy column/card IDs to new UUIDs;
- do not let imported JSON choose durable production primary keys.

### 10. Billing and tier enforcement are missing

The user goal includes charging for use, but the draft plan does not cover billing. Supabase Auth plus tables does not create a SaaS business model by itself.

Recommended correction:

- use Stripe Checkout or another hosted payment flow;
- create Stripe Customer records server-side;
- handle Stripe subscription webhooks server-side;
- store subscription status in your database;
- enforce free-tier limits server-side, not only in the frontend.

If free users are limited to a number of boards, columns, or cards, that rule must be enforced by database functions, triggers, RLS-aware RPC, or trusted server/Edge Function code. Frontend-only checks are bypassable.

### 11. Public launch concerns are missing

Before public launch, the migration plan should include:

- signup/login/logout;
- password reset and email verification decisions;
- account deletion/export;
- abuse/rate-limit strategy;
- backups;
- privacy policy implications of storing URLs, titles, notes, and fetching favicons from a third-party favicon service;
- production error reporting;
- a real test command and at least smoke/integration coverage for persistence.

## Recommended Revised Plan

### Phase 0: Architecture Decisions

Decide these before coding the Supabase migration:

- Launch data model: one default board per user, with a `boards` table for future multi-board support.
- Initial auth methods: email/password or magic link is enough for launch.
- Initial free/paid limits: for example, free users get 1 board and N cards; paid users get higher or unlimited limits.
- Deployment split: static frontend host plus Supabase Auth/Postgres, with Supabase Edge Functions or another backend for Stripe.
- Environments: local, staging, production.

Deliverable: one short architecture decision doc plus the first Supabase migration.

### Phase 1: Refactor The Storage Boundary While Still Local

Before adding Supabase calls, make the current app persistence swappable.

- Create one repository module that owns persistence.
- Move duplicated localStorage logic out of `app/app.js` and `app/storage.local.js`.
- Replace direct calls to `save()` and `LinkBoardStorage.saveState(state)` with repository calls.
- Make repository methods async even while the backing store is still localStorage.
- Keep localStorage for theme and other harmless browser preferences.

This reduces migration risk because the UI will already be dealing with async persistence before Supabase is introduced.

### Phase 2: Add Supabase Auth And Schema

Create migrations for the core SaaS data model.

Recommended initial tables:

```sql
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My LinkBoard',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

columns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  title text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  column_id uuid not null references columns(id) on delete cascade,
  url text not null,
  title text,
  note text,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

The repeated `owner_id` is intentional. It makes RLS policies simpler and faster. Add constraints, triggers, or composite foreign keys so `owner_id`, `board_id`, and `column_id` cannot drift apart.

Add indexes on:

- `boards(owner_id, position)`
- `columns(owner_id, board_id, position)`
- `cards(owner_id, board_id, column_id, position)`

Enable RLS on every user-data table and create policies scoped to `auth.uid()`.

### Phase 3: Implement The Supabase Repository

Add a Supabase-backed repository that matches the local repository interface.

Use simple table operations for low-risk actions, but use RPC/functions for operations that must be atomic:

- moving a card between columns;
- reordering a column;
- reordering cards;
- deleting a column and moving its cards;
- deleting a column and its cards;
- importing a full JSON board;
- enforcing free-tier limits.

At this phase, the app should load the signed-in user's default board from Supabase and no longer rely on `localStorage` for durable board data.

### Phase 4: Account UI And Existing Data Import

Add the minimal account surface:

- signed-out state;
- signup/login;
- logout;
- password reset or magic-link flow;
- create default board on first login;
- import existing JSON into the signed-in account;
- export the signed-in user's board as JSON.

For your personal existing data, import after creating your own user account. For user-facing import, validate JSON, map legacy IDs to UUIDs, and perform the import transactionally.

### Phase 5: Billing And Quotas

Add billing before launch, not after launch.

Recommended shape:

- Stripe Checkout for subscription signup.
- Stripe Customer Portal for billing management.
- A server-side webhook endpoint to sync subscription status.
- A `subscriptions` or `billing_customers` table tied to `profiles.id`.
- Server-side quota checks for free-tier limits.

Do not trust client-side plan state for authorization. The UI can hide paid features, but the database/server must enforce the limits.

### Phase 6: Public Launch Hardening

Before opening to real users:

- add tests for RLS isolation;
- add tests for reorder/delete/import transaction behavior;
- add tests for free-tier enforcement;
- verify no secret/service-role key is shipped to the browser;
- update copy that still references localStorage;
- decide whether to keep or replace the inline single-file build path;
- consider bundling SortableJS instead of relying on a CDN at runtime;
- add backups and basic observability.

## Minimum Test Checklist

- Unauthenticated users cannot select, insert, update, or delete boards, columns, or cards.
- User A cannot access User B's rows by guessing IDs.
- A user cannot insert rows with another user's `owner_id`.
- Reordering cards persists after refresh.
- Moving cards between columns persists after refresh.
- Deleting a column with "move cards" either fully succeeds or fully fails.
- Deleting a column with "delete cards" either fully succeeds or fully fails.
- The app never leaves a user with zero columns unless that is an intentional product decision.
- Import maps old JSON IDs to new UUIDs and rolls back on invalid data.
- Free-tier card/board/column limits are enforced even if the browser code is modified.
- Stripe webhook handling is idempotent and verifies webhook signatures.

## Recommended Next Step

Do not start by replacing localStorage reads with Supabase reads. Start by writing the schema/RLS migration and refactoring the current persistence into an async repository interface. That creates the right foundation without changing the visual design.

The first concrete implementation task should be:

1. Add `supabase/migrations/<timestamp>_initial_schema.sql` with `profiles`, `boards`, `columns`, `cards`, indexes, RLS, and policies.
2. Add a local async repository adapter that preserves current behavior.
3. Replace the direct storage calls in `app/app.js` with the repository API.

After that, the Supabase adapter can be added with much less UI churn.

## Primary References Consulted

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth overview: https://supabase.com/docs/guides/auth
- Supabase Auth users: https://supabase.com/docs/guides/auth/users
- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe Customer Portal: https://docs.stripe.com/billing/subscriptions/integrating-customer-portal
