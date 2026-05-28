-- NotUX initial schema
-- Free-for-all sharing model: any visitor to a public board can read/write.
-- Named snapshots and board-title edits are restricted to the board owner.

create extension if not exists "pgcrypto";

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled board',
  owner_id uuid references auth.users(id) on delete set null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  idx integer not null,
  title text not null default 'Page',
  deleted_at timestamptz
);
create index if not exists pages_board_idx on pages (board_id, idx);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  kind text not null check (kind in ('autosave', 'named')),
  label text,
  ydoc bytea not null,
  created_at timestamptz not null default now()
);
create unique index if not exists snapshots_one_autosave_per_board
  on snapshots (board_id) where kind = 'autosave';
create index if not exists snapshots_board_created on snapshots (board_id, created_at desc);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  kind text not null check (kind in ('pdf', 'image')),
  storage_path text not null,
  original_filename text not null,
  page_count integer,
  created_at timestamptz not null default now()
);
create index if not exists assets_board on assets (board_id);

-- Row Level Security: public boards are free-for-all.
alter table boards enable row level security;
alter table pages enable row level security;
alter table snapshots enable row level security;
alter table assets enable row level security;

create policy boards_read_public on boards
  for select using (is_public = true);
create policy boards_insert_any on boards
  for insert with check (true);
create policy boards_update_owner on boards
  for update using (owner_id is null or owner_id = auth.uid())
  with check (owner_id is null or owner_id = auth.uid());

create policy pages_rw_public on pages
  for all
  using (exists (select 1 from boards b where b.id = pages.board_id and b.is_public))
  with check (exists (select 1 from boards b where b.id = pages.board_id and b.is_public));

create policy snapshots_read_public on snapshots
  for select using (exists (select 1 from boards b where b.id = snapshots.board_id and b.is_public));

-- Autosave writes are free-for-all on public boards; named snapshots require ownership.
create policy snapshots_autosave_rw on snapshots
  for insert with check (
    kind = 'autosave'
    and exists (select 1 from boards b where b.id = snapshots.board_id and b.is_public)
  );
create policy snapshots_autosave_update on snapshots
  for update using (
    kind = 'autosave'
    and exists (select 1 from boards b where b.id = snapshots.board_id and b.is_public)
  );
create policy snapshots_named_owner on snapshots
  for insert with check (
    kind = 'named'
    and exists (select 1 from boards b where b.id = snapshots.board_id and b.owner_id = auth.uid())
  );

create policy assets_rw_public on assets
  for all
  using (exists (select 1 from boards b where b.id = assets.board_id and b.is_public))
  with check (exists (select 1 from boards b where b.id = assets.board_id and b.is_public));
