-- NotUX security hardening: private-by-default + capability share tokens
--
-- Replaces the "free-for-all public board" authorization model (0001/0002) with
-- an explicit membership model. The core defects this closes:
--
--   * boards_insert_any WITH CHECK (true)  -> anyone (incl. anon) could insert
--     unlimited boards (write-open + DoS surface).
--   * is_public granted full READ/WRITE/DELETE on pages/snapshots/assets to
--     anyone holding a board UUID — a harvested/leaked URL meant a stranger
--     could overwrite or wipe a tutor's lesson and poison the autosave row.
--   * board-assets was a PUBLIC storage bucket -> uploaded PDFs/images/audio
--     (potentially a minor's materials) were world-readable and world-writable.
--
-- New model:
--   * board_members(board_id, user_id, role) is the source of truth for access.
--     A board's creator is auto-enrolled as 'owner' by a trigger.
--   * board_shares holds hashed, expiring, revocable capability tokens. The
--     owner mints a token (create_board_share); a recipient — including an
--     anonymous guest student — redeems it (redeem_share_token) to gain a
--     scoped membership. The raw token is returned exactly once and only its
--     SHA-256 hash is stored, so leaking the shares table does not leak access.
--   * RLS is rewritten so READ is allowed for owner/member (and, transitionally,
--     legacy public boards) while WRITE/DELETE require an owning or editing
--     membership. is_public is kept ONLY as a legacy read path; it no longer
--     grants write access to anyone.
--   * board-assets becomes a PRIVATE bucket; bytes are reachable only via
--     short-lived signed URLs whose issuance is gated by the same membership RLS.
--   * realtime.messages policies authorize private Broadcast channels
--     (notux-board-<id>) by membership, ready for the client to switch on with
--     `private: true` once "Allow public access" is disabled in Realtime
--     settings (a Dashboard toggle that cannot be expressed in SQL).
--
-- Roles: 'owner' (full control), 'co_teach' / 'draw' (read + write), 'view'
-- (read only). The "writable" set is everything except 'view'.

-- ---------------------------------------------------------------------------
-- membership + share-token tables
-- ---------------------------------------------------------------------------
create table if not exists board_members (
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'view' check (role in ('owner', 'co_teach', 'draw', 'view')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index if not exists board_members_user on board_members (user_id);

create table if not exists board_shares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  -- SHA-256 hex of the capability token. The raw token is never stored.
  token_hash text not null unique,
  role text not null default 'draw' check (role in ('co_teach', 'draw', 'view')),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists board_shares_board on board_shares (board_id);

-- ---------------------------------------------------------------------------
-- authorization helpers
--
-- All SECURITY DEFINER so they bypass RLS on the tables they read; this is what
-- prevents recursion when a policy on one table needs to consult another
-- (e.g. the boards SELECT policy calls is_board_member, which reads
-- board_members WITHOUT re-triggering board_members' own policies). They read
-- auth.uid() from the request JWT, so they evaluate per-caller.
-- ---------------------------------------------------------------------------
create or replace function public.is_board_owner(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from boards where id = b and owner_id = auth.uid());
$$;

create or replace function public.is_board_member(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from board_members
    where board_id = b and user_id = auth.uid()
  );
$$;

-- Read is allowed for the owner, any member, or — transitionally — a legacy
-- public board. Drop the is_public disjunct in a later migration to make boards
-- strictly private.
create or replace function public.can_read_board(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from boards
    where id = b and (is_public or owner_id = auth.uid())
  ) or public.is_board_member(b);
$$;

-- Write requires ownership or an editing membership. is_public does NOT grant
-- write — this is the hole 0001 left open.
create or replace function public.can_write_board(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from boards where id = b and owner_id = auth.uid())
      or exists (
        select 1 from board_members
        where board_id = b and user_id = auth.uid()
          and role in ('owner', 'co_teach', 'draw')
      );
$$;

grant execute on function public.is_board_owner(uuid) to anon, authenticated;
grant execute on function public.is_board_member(uuid) to anon, authenticated;
grant execute on function public.can_read_board(uuid) to anon, authenticated;
grant execute on function public.can_write_board(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- owner auto-enrollment + backfill
-- ---------------------------------------------------------------------------
create or replace function public.handle_board_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.owner_id is not null then
    insert into board_members (board_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (board_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists on_board_owner_set on boards;
create trigger on_board_owner_set
  after insert or update of owner_id on boards
  for each row execute function public.handle_board_owner_membership();

-- Backfill memberships for boards that already have an owner.
insert into board_members (board_id, user_id, role)
select id, owner_id, 'owner' from boards where owner_id is not null
on conflict (board_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- boards RLS: drop free-for-all insert; gate read on membership/public;
-- restrict update/delete to the owner.
-- ---------------------------------------------------------------------------
drop policy if exists boards_insert_any on boards;
drop policy if exists boards_read_public on boards;
drop policy if exists boards_read_owner_or_public on boards;
drop policy if exists boards_update_owner on boards;

create policy boards_select on boards
  for select using (is_public or owner_id = auth.uid() or public.is_board_member(id));

-- Auth required to create a board, and only as yourself.
create policy boards_insert_owner on boards
  for insert with check (owner_id = auth.uid());

-- Owner may edit; a signed-in user may claim a legacy unowned board to themself.
create policy boards_update_owner on boards
  for update
  using (owner_id = auth.uid() or (owner_id is null and auth.uid() is not null))
  with check (owner_id = auth.uid());

create policy boards_delete_owner on boards
  for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- pages / snapshots / assets RLS: read for accessible boards, write for editors.
-- ---------------------------------------------------------------------------
drop policy if exists pages_rw_public on pages;
drop policy if exists pages_rw_accessible on pages;
create policy pages_select on pages
  for select using (public.can_read_board(board_id));
create policy pages_insert on pages
  for insert with check (public.can_write_board(board_id));
create policy pages_update on pages
  for update using (public.can_write_board(board_id))
  with check (public.can_write_board(board_id));
create policy pages_delete on pages
  for delete using (public.can_write_board(board_id));

drop policy if exists snapshots_read_public on snapshots;
drop policy if exists snapshots_read_accessible on snapshots;
drop policy if exists snapshots_autosave_rw on snapshots;
drop policy if exists snapshots_autosave_update on snapshots;
drop policy if exists snapshots_named_owner on snapshots;

create policy snapshots_select on snapshots
  for select using (public.can_read_board(board_id));
-- Autosave is writable by any editor (so a co-teacher's client can persist).
create policy snapshots_autosave_insert on snapshots
  for insert with check (kind = 'autosave' and public.can_write_board(board_id));
create policy snapshots_autosave_update on snapshots
  for update using (kind = 'autosave' and public.can_write_board(board_id))
  with check (kind = 'autosave' and public.can_write_board(board_id));
-- Named versions remain owner-only to create and remove.
create policy snapshots_named_insert on snapshots
  for insert with check (kind = 'named' and public.is_board_owner(board_id));
create policy snapshots_named_delete on snapshots
  for delete using (kind = 'named' and public.is_board_owner(board_id));

drop policy if exists assets_rw_public on assets;
drop policy if exists assets_rw_accessible on assets;
create policy assets_select on assets
  for select using (public.can_read_board(board_id));
create policy assets_insert on assets
  for insert with check (public.can_write_board(board_id));
create policy assets_update on assets
  for update using (public.can_write_board(board_id))
  with check (public.can_write_board(board_id));
create policy assets_delete on assets
  for delete using (public.can_write_board(board_id));

-- ---------------------------------------------------------------------------
-- board_members / board_shares RLS
-- ---------------------------------------------------------------------------
alter table board_members enable row level security;
alter table board_shares enable row level security;

-- A user sees their own memberships; an owner sees/manages all members of their
-- boards. (is_board_owner is SECURITY DEFINER, so referencing boards here does
-- not recurse through board RLS.)
create policy board_members_select on board_members
  for select using (user_id = auth.uid() or public.is_board_owner(board_id));
create policy board_members_owner_insert on board_members
  for insert with check (public.is_board_owner(board_id));
create policy board_members_owner_update on board_members
  for update using (public.is_board_owner(board_id))
  with check (public.is_board_owner(board_id));
-- Owner may revoke anyone; a member may remove themself (leave the board).
create policy board_members_delete on board_members
  for delete using (public.is_board_owner(board_id) or user_id = auth.uid());

-- Shares are owner-only end to end. Recipients never read the table; they redeem
-- through the SECURITY DEFINER RPC below, which never exposes the token hash.
create policy board_shares_owner_all on board_shares
  for all
  using (public.is_board_owner(board_id))
  with check (public.is_board_owner(board_id));

-- ---------------------------------------------------------------------------
-- capability-token RPCs
-- ---------------------------------------------------------------------------

-- Owner mints a share link. Returns the RAW token exactly once; only its hash is
-- persisted. Encode the returned token into the share URL fragment client-side.
create or replace function public.create_board_share(
  p_board_id uuid,
  p_role text default 'draw',
  p_ttl_seconds integer default 604800  -- 7 days
)
returns text
language plpgsql
security definer
-- `extensions` on the path so pgcrypto's digest()/gen_random_bytes() resolve
-- (Supabase installs pgcrypto into the extensions schema).
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text;
begin
  if not public.is_board_owner(p_board_id) then
    raise exception 'not authorized to share this board';
  end if;
  if p_role not in ('co_teach', 'draw', 'view') then
    raise exception 'invalid role: %', p_role;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into board_shares (board_id, token_hash, role, created_by, expires_at)
  values (
    p_board_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    p_role,
    auth.uid(),
    case when p_ttl_seconds is null or p_ttl_seconds <= 0
         then null
         else now() + make_interval(secs => p_ttl_seconds) end
  );
  return v_token;
end;
$$;

-- A recipient (signed-in user OR anonymous guest) redeems a token to gain a
-- scoped membership. Requires an authenticated identity — guests must obtain an
-- anonymous session first — so every collaborator has a stable id for RLS.
-- Output columns are deliberately NOT named board_id/role: those would be
-- in-scope OUT-parameter variables inside the body and collide with the
-- board_members columns referenced in the INSERT / ON CONFLICT clause.
create or replace function public.redeem_share_token(p_token text)
returns table (redeemed_board_id uuid, redeemed_role text)
language plpgsql
security definer
-- `extensions` for pgcrypto's digest() (see create_board_share).
set search_path = public, extensions, pg_temp
as $$
declare
  v_share board_shares%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required to redeem a share';
  end if;

  select * into v_share from board_shares
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and not revoked
    and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'invalid or expired share token';
  end if;

  insert into board_members (board_id, user_id, role)
  values (v_share.board_id, auth.uid(), v_share.role)
  on conflict (board_id, user_id) do nothing;

  redeemed_board_id := v_share.board_id;
  redeemed_role := v_share.role;
  return next;
end;
$$;

grant execute on function public.create_board_share(uuid, text, integer) to authenticated;
grant execute on function public.redeem_share_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: make board-assets private; gate by membership; serve via signed URLs.
-- ---------------------------------------------------------------------------
update storage.buckets set public = false where id = 'board-assets';

drop policy if exists "board_assets_read_public" on storage.objects;
drop policy if exists "board_assets_insert_public" on storage.objects;
drop policy if exists "board_assets_update_public" on storage.objects;
drop policy if exists "board_assets_delete_public" on storage.objects;

-- (storage.foldername(name))[1] is the first path segment, i.e. the board id.
create policy "board_assets_read" on storage.objects
  for select using (
    bucket_id = 'board-assets'
    and public.can_read_board(((storage.foldername(name))[1])::uuid)
  );
create policy "board_assets_insert" on storage.objects
  for insert with check (
    bucket_id = 'board-assets'
    and public.can_write_board(((storage.foldername(name))[1])::uuid)
  );
create policy "board_assets_update" on storage.objects
  for update using (
    bucket_id = 'board-assets'
    and public.can_write_board(((storage.foldername(name))[1])::uuid)
  );
create policy "board_assets_delete" on storage.objects
  for delete using (
    bucket_id = 'board-assets'
    and public.can_write_board(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Realtime Authorization for private Broadcast/Presence channels.
--
-- These policies are only consulted when the client opens the channel with
-- `private: true` AND "Allow public access" is disabled in the project's
-- Realtime settings. They are harmless (never evaluated) for public channels,
-- so they can ship ahead of the client cutover.
-- ---------------------------------------------------------------------------
create or replace function public.board_id_from_topic(p_topic text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_topic is null or p_topic not like 'notux-board-%' then
    return null;
  end if;
  return substring(p_topic from 13)::uuid;  -- strip 'notux-board-'
exception when others then
  return null;  -- malformed topic -> no access
end;
$$;
grant execute on function public.board_id_from_topic(text) to anon, authenticated;

drop policy if exists "notux_realtime_read" on realtime.messages;
drop policy if exists "notux_realtime_write" on realtime.messages;

create policy "notux_realtime_read" on realtime.messages
  for select to authenticated
  using (public.can_read_board(public.board_id_from_topic((select realtime.topic()))));

create policy "notux_realtime_write" on realtime.messages
  for insert to authenticated
  with check (public.can_write_board(public.board_id_from_topic((select realtime.topic()))));
