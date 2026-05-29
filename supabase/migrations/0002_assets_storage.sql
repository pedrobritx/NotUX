-- NotUX M6: public Storage bucket for imported PDF/image bytes.
-- Mirrors the free-for-all public-board model (see 0001_init.sql): anyone may
-- read/write objects whose first path segment is a public board's id.
-- Path convention: <boardId>/<assetId>  (matches Asset.storage_path).

insert into storage.buckets (id, name, public)
values ('board-assets', 'board-assets', true)
on conflict (id) do nothing;

-- (storage.foldername(name))[1] is the first path segment, i.e. the board id.
create policy "board_assets_read_public"
  on storage.objects for select
  using (
    bucket_id = 'board-assets'
    and exists (
      select 1 from boards b
      where b.id = (storage.foldername(name))[1]::uuid
        and b.is_public
    )
  );

create policy "board_assets_insert_public"
  on storage.objects for insert
  with check (
    bucket_id = 'board-assets'
    and exists (
      select 1 from boards b
      where b.id = (storage.foldername(name))[1]::uuid
        and b.is_public
    )
  );

create policy "board_assets_update_public"
  on storage.objects for update
  using (
    bucket_id = 'board-assets'
    and exists (
      select 1 from boards b
      where b.id = (storage.foldername(name))[1]::uuid
        and b.is_public
    )
  );

create policy "board_assets_delete_public"
  on storage.objects for delete
  using (
    bucket_id = 'board-assets'
    and exists (
      select 1 from boards b
      where b.id = (storage.foldername(name))[1]::uuid
        and b.is_public
    )
  );
