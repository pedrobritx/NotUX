import type { SupabaseClient } from "@supabase/supabase-js";

// Public Supabase Storage bucket holding imported PDF/image bytes. Created by
// the 0002_assets_storage.sql migration with free-for-all RLS on public boards.
export const BOARD_ASSETS_BUCKET = "board-assets";

// Deterministic object key for an asset. Because it is derived purely from the
// board + asset id, the renderer can locate bytes from a YAssetRef alone — no
// separate metadata lookup is needed.
export function assetPath(boardId: string, assetId: string): string {
  return `${boardId}/${assetId}`;
}

export async function uploadAsset(
  client: SupabaseClient,
  boardId: string,
  assetId: string,
  file: File,
): Promise<void> {
  const { error } = await client.storage
    .from(BOARD_ASSETS_BUCKET)
    .upload(assetPath(boardId, assetId), file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) throw error;
}

// Public URL for an asset's bytes, suitable for a direct <audio src>. The
// board-assets bucket is public (0002 migration), so no signing is needed.
export function assetPublicUrl(
  client: SupabaseClient,
  boardId: string,
  assetId: string,
): string {
  return client.storage
    .from(BOARD_ASSETS_BUCKET)
    .getPublicUrl(assetPath(boardId, assetId)).data.publicUrl;
}

export async function downloadAssetBlob(
  client: SupabaseClient,
  boardId: string,
  assetId: string,
): Promise<Blob> {
  const { data, error } = await client.storage
    .from(BOARD_ASSETS_BUCKET)
    .download(assetPath(boardId, assetId));
  if (error || !data) {
    throw error ?? new Error("Asset download returned no data");
  }
  return data;
}
