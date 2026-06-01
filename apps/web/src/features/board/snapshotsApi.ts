import type { SupabaseClient } from "@supabase/supabase-js";
import { bytesToHexBytea, hexByteaToBytes } from "@notux/sync";

export interface NamedSnapshot {
  id: string;
  label: string;
  createdAt: string;
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
