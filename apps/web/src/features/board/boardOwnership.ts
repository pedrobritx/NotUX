import type { SupabaseClient } from "@supabase/supabase-js";

// Ensure a `boards` row exists for this id and claim ownership when it is
// unowned and we are signed in. Idempotent. Returns whether the current user
// owns the board, which gates the named-snapshot Save/Restore UI (owner-only per
// the RLS policy in 0001_init.sql).
//
// Safe to call with a null client (local-only mode) or signed out — both yield
// { owned: false } without throwing, so PDF export and undo still work.
export async function ensureBoardOwnership(
  client: SupabaseClient | null,
  boardId: string,
): Promise<{ owned: boolean }> {
  if (!client) return { owned: false };

  const { data: auth } = await client.auth.getUser();
  const userId = auth.user?.id ?? null;

  // SELECT is allowed for any public board.
  const { data: existing } = await client
    .from("boards")
    .select("id, owner_id")
    .eq("id", boardId)
    .maybeSingle();

  if (!userId) return { owned: false };

  if (!existing) {
    // boards_insert_any allows check(true); claim ownership on first load.
    const { error } = await client
      .from("boards")
      .insert({ id: boardId, owner_id: userId });
    if (error) {
      // A racing peer may have inserted first → re-read to settle ownership.
      const { data: row } = await client
        .from("boards")
        .select("owner_id")
        .eq("id", boardId)
        .maybeSingle();
      return { owned: row?.owner_id === userId };
    }
    return { owned: true };
  }

  if (existing.owner_id === userId) return { owned: true };

  if (existing.owner_id === null) {
    // boards_update_owner allows update while owner_id is null.
    const { error } = await client
      .from("boards")
      .update({ owner_id: userId })
      .eq("id", boardId)
      .is("owner_id", null);
    return { owned: !error };
  }

  return { owned: false }; // owned by someone else
}
