import type { SupabaseClient } from "@supabase/supabase-js";

export interface NamedSnapshot {
  id: string;
  label: string;
  createdAt: string;
}

// PostgREST reads/writes a `bytea` column as a hex string in the "\x.." format.
// Encoding the Yjs update as hex avoids needing a server-side base64 decode RPC
// and works against the stock schema.
function bytesToHexBytea(bytes: Uint8Array): string {
  let hex = "\\x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function hexByteaToBytes(s: string): Uint8Array {
  const hex = s.startsWith("\\x") ? s.slice(2) : s;
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export async function saveNamedSnapshot(
  client: SupabaseClient,
  boardId: string,
  label: string,
  bytes: Uint8Array,
): Promise<void> {
  const { error } = await client.from("snapshots").insert({
    board_id: boardId,
    kind: "named",
    label,
    ydoc: bytesToHexBytea(bytes),
  });
  if (error) throw error;
}

export async function listNamedSnapshots(
  client: SupabaseClient,
  boardId: string,
): Promise<NamedSnapshot[]> {
  const { data, error } = await client
    .from("snapshots")
    .select("id, label, created_at")
    .eq("board_id", boardId)
    .eq("kind", "named")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    label: (r.label as string | null) ?? "Untitled",
    createdAt: r.created_at as string,
  }));
}

export async function fetchSnapshotBytes(
  client: SupabaseClient,
  id: string,
): Promise<Uint8Array> {
  const { data, error } = await client
    .from("snapshots")
    .select("ydoc")
    .eq("id", id)
    .single();
  if (error || !data) throw error ?? new Error("snapshot not found");
  return hexByteaToBytes(data.ydoc as string);
}
