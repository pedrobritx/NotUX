-- NotUX: allow audio assets (MP3 upload) alongside pdf/image.
-- Widens the assets.kind CHECK constraint from 0001_init.sql. The board-assets
-- bucket and RLS (0002) already accept arbitrary bytes, so no storage change is
-- needed. The metadata row is best-effort (assetStore.ingest swallows failures),
-- but keeping the constraint in sync avoids rejecting valid audio rows.

alter table assets drop constraint if exists assets_kind_check;

alter table assets
  add constraint assets_kind_check
  check (kind in ('pdf', 'image', 'audio'));
