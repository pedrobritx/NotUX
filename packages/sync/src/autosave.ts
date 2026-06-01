import * as Y from "yjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encodeSnapshot } from "./snapshots";

// PostgREST reads/writes a `bytea` column as a hex string in the "\x.." format.
// Encoding the Yjs update as hex avoids needing a server-side base64 decode RPC
// and works against the stock schema. Shared with the named-snapshot API in the
// web app so there's a single source for the bytea wire format.
export function bytesToHexBytea(bytes: Uint8Array): string {
  let hex = "\\x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export function hexByteaToBytes(s: string): Uint8Array {
  const hex = s.startsWith("\\x") ? s.slice(2) : s;
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// Fetch the board's durable `autosave` snapshot from Postgres and MERGE it into
// the live doc. Uses Y.applyUpdate (a CRDT merge), NOT restoreSnapshot — the
// latter is a destructive time-travel replace used by the named-snapshot panel.
// Merging is order-independent and convergent, so it's safe to call after the
// IndexedDB hydrate and after the realtime provider has attached. This is what
// lets a fresh client (no IndexedDB) or a late-joiner arriving after every peer
// has left still load the last board state.
export async function loadAutosave(
  client: SupabaseClient,
  boardId: string,
  doc: Y.Doc,
): Promise<void> {
  const { data, error } = await client
    .from("snapshots")
    .select("ydoc")
    .eq("board_id", boardId)
    .eq("kind", "autosave")
    .maybeSingle();
  if (error || !data?.ydoc) return;
  Y.applyUpdate(doc, hexByteaToBytes(data.ydoc as string));
}

// Write the full board state to the single per-board `autosave` row. The schema
// keeps one self-compacting row (Y.encodeStateAsUpdate already compacts), so
// there's no append-log to compact — we update-or-insert in place. PostgREST
// can't upsert onto the partial unique index (board_id where kind='autosave'),
// so we branch: try update first, insert only if no row existed.
async function writeAutosave(
  client: SupabaseClient,
  boardId: string,
  doc: Y.Doc,
): Promise<void> {
  const ydoc = bytesToHexBytea(encodeSnapshot(doc));
  const { data, error } = await client
    .from("snapshots")
    .update({ ydoc })
    .eq("board_id", boardId)
    .eq("kind", "autosave")
    .select("id");
  if (error) return;
  if (!data || data.length === 0) {
    await client.from("snapshots").insert({ board_id: boardId, kind: "autosave", ydoc });
  }
}

const DEBOUNCE_MS = 2_000;
const MAX_WAIT_MS = 10_000;

// Persist the doc to Postgres on every change, debounced (~2s) with a max-wait
// (~10s) so a long uninterrupted editing burst still flushes periodically.
// Best-effort flush on pagehide / tab-hide so the last edits aren't lost on
// close. Returns a stop() that detaches all listeners and timers.
export function startAutosave(
  client: SupabaseClient,
  boardId: string,
  doc: Y.Doc,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let firstChangeAt: number | null = null;
  let stopped = false;

  const flush = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    firstChangeAt = null;
    if (!stopped) void writeAutosave(client, boardId, doc);
  };

  const onUpdate = () => {
    const now = Date.now();
    if (firstChangeAt === null) firstChangeAt = now;
    if (now - firstChangeAt >= MAX_WAIT_MS) {
      flush();
      return;
    }
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, DEBOUNCE_MS);
  };

  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };

  doc.on("update", onUpdate);
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
  }

  return () => {
    stopped = true;
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    doc.off("update", onUpdate);
    if (hasWindow) {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    }
  };
}
