import type { SupabaseClient } from "@supabase/supabase-js";

// Private Supabase Storage bucket holding imported PDF/image/audio bytes.
// Created public by 0002 but flipped to PRIVATE by 0005_security_membership.sql:
// reads/writes are gated by board membership RLS and bytes are reachable only
// via short-lived signed URLs (see assetSignedUrl), never a permanent public URL.
export const BOARD_ASSETS_BUCKET = "board-assets";

// TTL for signed asset URLs. Short by design: a signed URL is a bearer token,
// so anyone holding it can fetch the object until it expires.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

// Short-lived signed URL for an asset's bytes, suitable for a direct <audio
// src>. The bucket is private, so the URL is minted per request and the caller
// must be an owner/member (enforced by storage RLS). Returns null when signing
// fails (e.g. no access), so callers can render an empty player rather than throw.
export async function assetSignedUrl(
  client: SupabaseClient,
  boardId: string,
  assetId: string,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(BOARD_ASSETS_BUCKET)
    .createSignedUrl(assetPath(boardId, assetId), SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
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
