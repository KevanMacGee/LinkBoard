# LinkBoard SaaS Migration Plan Review v2

Date: 2026-04-21

## Scope

This v2 updates my earlier review after reading the added `tentative-schema-042126.md` file and your clarification about launch philosophy:

- multiple boards are likely post-launch;
- a free public MVP is acceptable before paid plans exist;
- speed matters because early traction is uncertain;
- the schema is close to settled but still open to final sanity checks.

I still reviewed only non-ignored files surfaced by `git ls-files --cached --others --exclude-standard`.

## Updated Verdict

I would soften one part of my original stance: billing does not need to block launch. A free public MVP with account-based cloud storage is reasonable, especially for a product that still needs to prove demand.

I would not soften the auth/RLS/data-ownership stance. If LinkBoard stores user data in Supabase from a public browser app, then Supabase Auth, row-level security, and per-user ownership need to exist before public launch. That is not "enterprise process"; it is the minimum line between "fast MVP" and "users can see or mutate each other's saved links."

The practical MVP target should be:

1. Supabase Auth.
2. One default board per user, even if the UI does not expose multi-board yet.
3. RLS policies on all user-data tables.
4. A server-enforced card limit for abuse control.
5. No paid billing yet.
6. Export/import retained as safety valves.

That gets you a launchable public beta without building the whole future SaaS.

## What Changed From v1

- Paid subscriptions can move after public beta.
- Stripe fields can be nullable placeholders or deferred entirely.
- Multiple-board UI can move after launch.
- A full staging/deployment/testing setup is recommended but not all launch-blocking.
- The `boards` table is still worth including now, but only as an internal default-board concept.
- The hard requirements are narrower: auth, RLS, ownership constraints, secret-key hygiene, and one server-side abuse limit.

## Current App Facts That Still Matter

- The app is a static frontend: `app/index.html`, `app/app.js`, and `app/styles.css`.
- Durable data is currently localStorage under `linkboard.v1` in `app/app.js:32`, `app/app.js:57`, and `app/app.js:64`.
- There is duplicated storage logic in `app/storage.local.js`, plus one path that calls `LinkBoardStorage.saveState(state)` directly in `app/app.js:908`.
- Core mutations are synchronous and local: card reorder at `app/app.js:370`, add/update/delete card at `app/app.js:401`, `app/app.js:408`, and `app/app.js:425`, and delete column at `app/app.js:440`.
- The current UI has columns and cards, but no visible multi-board workflow.
- The current app copy still says everything saves to localStorage in `app/index.html:56`.

The migration risk is not "Supabase table creation." The migration risk is making a local synchronous app behave correctly when persistence becomes async, authenticated, and failure-prone.

## Launch-Fast Principles I Would Use Here

These are worth deferring:

- paid subscriptions;
- public board sharing;
- multiple-board UI;
- teams/collaboration;
- polished account settings;
- complex analytics;
- browser extension;
- advanced search;
- enterprise-grade observability.

These should not be deferred if user data goes into Supabase:

- auth;
- RLS;
- per-user ownership;
- UUID database IDs;
- no service-role/secret key in browser code;
- export/import safety path;
- database-enforced card limit or equivalent abuse guard;
- basic tests/manual verification for cross-user isolation.

This is the balance: defer product scope, not data isolation.

## Schema Sanity Check

Your tentative schema is directionally right:

```text
profiles(id, email, plan, stripe_customer_id, created_at, updated_at)
boards(id, owner_id, name, maybe is_public, created_at, updated_at)
columns(id, board_id, owner_id, title, position, created_at, updated_at)
cards(id, column_id, owner_id, title, url, note, position, created_at, updated_at)
```

I would make these revisions before implementing it.

### 1. Keep `boards`, but treat it as hidden infrastructure

Even if multiple boards are post-launch, I would keep a `boards` table now. The UI can create exactly one default board per user and never show board switching.

Why this is still pragmatic:

- adding `board_id` later means migrating every column/card anyway;
- a hidden default board adds little UI complexity;
- it keeps the future multi-board feature from becoming a structural rewrite.

This is a good example of small upfront planning that does not slow MVP much.

### 2. Add `position` to `boards` only if you expect ordered board lists

If future boards are just named workspaces with no custom order, skip it. If you expect users to reorder boards later, add:

```text
boards.position
```

Not launch-critical either way.

### 3. Be cautious with `is_public`

I would not include public sharing policies in the MVP.

You can include `is_public boolean not null default false` as a future placeholder, but do not create public read RLS policies until you actually build public sharing. Public boards are a separate product/security feature. They raise questions around secret URLs, indexing, abuse reporting, deletion, and whether notes are safe to expose.

Fastest safe option: omit `is_public` for now.

Second-best option: include it, default false, and ignore it until a later migration.

### 4. Add `board_id` to `cards`

Your tentative `cards` table has `column_id` and `owner_id`, but not `board_id`.

You can infer a card's board through its column, so this is not strictly required. But for this app, I recommend adding `board_id` to `cards` because:

- the main load path is "load this board";
- import/export is board-shaped;
- quota checks can be board/user scoped more easily;
- future multi-board moves/search/export get simpler;
- RLS and indexes are easier to reason about.

The cost is duplicated data, so add constraints to prevent drift.

### 5. Use UUID primary keys, not imported/local IDs

Current local IDs are short random strings generated in the browser. Keep them only as legacy import identifiers.

Use database UUIDs for:

- `profiles.id`
- `boards.id`
- `columns.id`
- `cards.id`

During JSON import, map old column/card IDs to new UUIDs.

### 6. `profiles.email` is optional and should not be canonical

Supabase Auth already owns the real user identity. A `profiles.email` copy can be useful for display/admin convenience, but it can become stale.

MVP choices:

- omit `profiles.email`; or
- keep it nullable as a convenience copy.

Do not build authorization around profile email. Authorization should use `auth.uid()` and user IDs.

### 7. `plan` is useful even before paid plans

Keep:

```text
profiles.plan text not null default 'free'
```

Even in a free beta, it gives you a place to distinguish `free`, `admin`, `early_access`, or future `pro` accounts.

If you want stricter DB modeling later, convert it to an enum or a plans table. For MVP, text plus a check constraint is fine.

### 8. `stripe_customer_id` can wait

If you are launching free, Stripe does not need to be in the MVP schema.

Either:

- omit `stripe_customer_id` now and add it later; or
- include it nullable with a unique partial index.

Do not build Stripe flows until you have a reason to charge or validate willingness to pay.

### 9. Add ownership consistency constraints

If you keep `owner_id` on boards, columns, and cards, prevent mismatches.

Recommended pattern:

```sql
boards:
  unique (id, owner_id)

columns:
  foreign key (board_id, owner_id) references boards(id, owner_id)
  unique (id, board_id, owner_id)

cards:
  foreign key (column_id, board_id, owner_id) references columns(id, board_id, owner_id)
```

This keeps a card from claiming one owner while pointing at another owner's column.

### 10. Add indexes for the app's real queries

Minimum useful indexes:

```text
boards(owner_id, created_at)
columns(owner_id, board_id, position)
cards(owner_id, board_id, column_id, position)
```

If you enforce card limits by counting user cards, add:

```text
cards(owner_id)
```

### 11. Do not over-constrain `position` too early

It is tempting to add unique constraints like `(column_id, position)`. That can make reordering harder because temporary duplicate positions happen during reorder updates.

For MVP:

- store integer positions;
- always query with `order by position, created_at`;
- normalize positions after moves/reorders;
- add stronger constraints later if needed.

If you do add unique position constraints, make them deferrable and do reorders in transactions/RPC functions.

## Recommended MVP Schema Shape

This is the lean version I would implement first:

```sql
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan in ('free', 'pro', 'admin'))
);

boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My LinkBoard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (board_id, owner_id) references boards(id, owner_id) on delete cascade,
  unique (id, board_id, owner_id)
);

cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null,
  column_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text,
  url text not null,
  note text,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (column_id, board_id, owner_id) references columns(id, board_id, owner_id) on delete cascade
);
```

Optional later:

- `profiles.email`
- `profiles.stripe_customer_id`
- `boards.position`
- `boards.is_public`
- `subscriptions`
- `board_members`
- `card_metadata`
- `favicon_url`
- full-text search indexes

## Minimum RLS Shape

Enable RLS on all user-data tables:

```sql
alter table profiles enable row level security;
alter table boards enable row level security;
alter table columns enable row level security;
alter table cards enable row level security;
```

Policies should be boring:

```text
profiles: user can select/update own profile
boards: user can select/insert/update/delete own boards
columns: user can select/insert/update/delete own columns
cards: user can select/insert/update/delete own cards
```

The important part is that every policy explicitly ties access to:

```sql
auth.uid() is not null and owner_id = auth.uid()
```

For `profiles`, use `id = auth.uid()`.

## MVP Abuse Control

If you launch free, you still need one durable limit to avoid obvious abuse.

Recommended MVP limit:

```text
free users can create up to N cards total
```

Pick an N that is generous for real early users and cheap for you. For example, 250 or 500 cards. The exact number is product/business judgment.

Do not enforce this only in the frontend. A user can bypass browser checks. Put the check in one of these places:

- a database trigger on `cards`;
- a `create_card` RPC function that is the only allowed insert path;
- a broader app backend/Edge Function.

Fastest Supabase-native choice: a database trigger that counts `cards.owner_id` and rejects inserts above the free limit.

## Updated Launch Plan

### Phase 0: Freeze The MVP Definition

For launch, define the product as:

- single visible board per account;
- columns and cards;
- search/filter;
- drag/drop card movement;
- JSON import/export;
- free accounts only;
- card count cap;
- no paid plans;
- no public sharing;
- no collaboration.

This is a real MVP and avoids pretending the full SaaS exists.

### Phase 1: Create The Supabase Foundation

Do this before changing the UI much:

- create Supabase project;
- add migrations for `profiles`, `boards`, `columns`, `cards`;
- enable RLS;
- create ownership policies;
- add updated-at trigger;
- add indexes;
- add free card-limit trigger or RPC;
- create a default-board creation path for new users.

This is still a small backend because Supabase is doing most of the work.

### Phase 2: Refactor Persistence Behind An Async Repository

The current app assumes local synchronous persistence. Before swapping in Supabase everywhere:

- create a persistence/repository layer;
- make load/save/mutation methods async;
- route existing localStorage behavior through that layer;
- remove the duplicated storage path where practical;
- keep theme preference in localStorage.

This reduces the chance of tangling Supabase calls directly into UI code.

### Phase 3: Add Auth UI

Minimal account UI only:

- sign up;
- log in;
- log out;
- password reset or magic link;
- signed-out state.

Do not build a full account settings area yet.

### Phase 4: Move Board Data To Supabase

Replace local board persistence with Supabase-backed repository methods:

- load default board;
- create card;
- update card;
- delete card;
- move/reorder cards;
- create/rename/delete columns;
- reorder columns;
- import JSON;
- export JSON.

For launch-fast purposes, simple direct Supabase writes are acceptable for simple create/update/delete operations if RLS and limits are correct. Use RPC/functions for operations where partial failure can corrupt user data, especially:

- import;
- delete column and move cards;
- reorder/move if direct multi-update proves flaky.

### Phase 5: Public Free Beta

Before inviting users:

- update copy that references localStorage;
- verify cross-user isolation manually with two accounts;
- verify the card cap cannot be bypassed from the browser console;
- verify import/export works;
- verify drag/drop persists after refresh;
- verify no secret/service-role key is in frontend files;
- keep a rollback/export story for your own data.

This is the point where I would be comfortable launching a free MVP.

### Phase 6: Add Paid Plans Only After Signal

After there is evidence people use it:

- add Stripe Checkout;
- add Customer Portal;
- add webhook handling;
- add subscription table;
- change `profiles.plan` based on webhook events;
- raise/remove limits for paid users.

This can be cleanly added later if the MVP schema already has `profiles.plan`.

### Phase 7: Add Multiple Boards

After traction:

- expose board switcher;
- add create/rename/delete board UI;
- optionally add board ordering;
- update import/export to target one board or all boards;
- decide if card limits are per-board or per-account.

Because the MVP already had `boards`, this becomes a UI/product expansion, not a database rescue mission.

## Practical Non-Negotiables

These are the few rules I would stay firm on:

1. Do not put a service-role or secret key in browser code.
2. Do not expose user tables without RLS.
3. Do not launch cloud persistence without per-user ownership.
4. Do not rely only on frontend checks for the card limit.
5. Do not implement public boards until the sharing model is deliberately designed.

Everything else can be traded against speed.

## Bottom Line

Your launch-fast instinct is correct. This project does not need a heavy SaaS buildout before seeing whether anyone cares.

The right MVP is not "full SaaS with billing." It is "free hosted LinkBoard accounts with safe private data storage and a reasonable abuse cap."

That means the plan should be lighter than my v1 on billing, staging, and public-launch polish. But it should stay strict on auth, RLS, ownership, and key handling because those are hard to patch after users trust you with their saved links.

## Primary References Checked For v2

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth overview: https://supabase.com/docs/guides/auth
- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
