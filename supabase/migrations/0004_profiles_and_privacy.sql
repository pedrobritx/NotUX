-- NotUX profiles + privacy
--
-- Adds a `profiles` table holding the signed-in user's identity (name, avatar,
-- provider) sourced from auth providers such as Google. A profile row is
-- private: only the user it belongs to can read or write it, so login/account
-- information is never exposed to other users. Presence names/colors shown to
-- collaborators come from each peer's own session broadcast over Realtime
-- awareness, never from reading another user's profile row.
--
-- Also threads board privacy through the existing RLS: a board is reachable by
-- anyone when `is_public = true` (collaborative, the share model) OR by its
-- owner regardless of publicity (so a user's private boards and their
-- annotations are visible only to them until they choose to share).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- A profile is strictly owner-only: read, insert, and update are gated to the
-- authenticated user whose id matches the row.
create policy profiles_select_own on profiles
  for select using (id = auth.uid());
create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-provision (and keep fresh) a profile row whenever an auth user is
-- created or their metadata changes. SECURITY DEFINER so it runs above RLS.
-- Google populates raw_user_meta_data with full_name/name + avatar_url + the
-- provider is recorded in raw_app_meta_data.provider.
create or replace function public.handle_profile_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, provider, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    provider = coalesce(excluded.provider, profiles.provider),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_upserted on auth.users;
create trigger on_auth_user_upserted
  after insert or update on auth.users
  for each row execute function public.handle_profile_upsert();

-- ---------------------------------------------------------------------------
-- board privacy: owners always reach their own boards; public boards stay
-- free-for-all for collaboration. Replaces the publicity-only policies from
-- 0001 with owner-aware variants.
-- ---------------------------------------------------------------------------

-- boards: owner can always read; otherwise must be public.
drop policy if exists boards_read_public on boards;
create policy boards_read_owner_or_public on boards
  for select using (is_public = true or owner_id = auth.uid());

-- pages / snapshots / assets gate on the same predicate: public board OR caller
-- owns it. Private-board content (annotations) is thus owner-only.
drop policy if exists pages_rw_public on pages;
create policy pages_rw_accessible on pages
  for all
  using (exists (
    select 1 from boards b
    where b.id = pages.board_id and (b.is_public or b.owner_id = auth.uid())
  ))
  with check (exists (
    select 1 from boards b
    where b.id = pages.board_id and (b.is_public or b.owner_id = auth.uid())
  ));

drop policy if exists snapshots_read_public on snapshots;
create policy snapshots_read_accessible on snapshots
  for select using (exists (
    select 1 from boards b
    where b.id = snapshots.board_id and (b.is_public or b.owner_id = auth.uid())
  ));

drop policy if exists snapshots_autosave_rw on snapshots;
create policy snapshots_autosave_rw on snapshots
  for insert with check (
    kind = 'autosave'
    and exists (
      select 1 from boards b
      where b.id = snapshots.board_id and (b.is_public or b.owner_id = auth.uid())
    )
  );

drop policy if exists snapshots_autosave_update on snapshots;
create policy snapshots_autosave_update on snapshots
  for update using (
    kind = 'autosave'
    and exists (
      select 1 from boards b
      where b.id = snapshots.board_id and (b.is_public or b.owner_id = auth.uid())
    )
  );

drop policy if exists assets_rw_public on assets;
create policy assets_rw_accessible on assets
  for all
  using (exists (
    select 1 from boards b
    where b.id = assets.board_id and (b.is_public or b.owner_id = auth.uid())
  ))
  with check (exists (
    select 1 from boards b
    where b.id = assets.board_id and (b.is_public or b.owner_id = auth.uid())
  ));
