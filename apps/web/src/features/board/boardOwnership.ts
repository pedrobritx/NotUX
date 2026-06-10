import type { SupabaseClient } from "@supabase/supabase-js";

export interface BoardAccess {
  owned: boolean;
  isPublic: boolean;
}

// Ensure a `boards` row exists for this id and claim ownership when it is
// unowned and we are signed in. Idempotent. Returns whether the current user
// owns the board (which gates the named-snapshot Save/Restore UI, owner-only
// per the RLS in 0001) and whether the board is public.
//
// Privacy model: a board a signed-in user creates is PRIVATE by default
// (is_public = false) so their annotations are visible only to them until they
// explicitly share it (see setBoardVisibility). Guests and pre-existing boards
// keep the legacy public/free-for-all behavior.
//
// Safe to call with a null client (local-only mode) or signed out — both yield
// { owned: false, isPublic: true } without throwing, so PDF export and undo
// still work.
export async function ensureBoardOwnership(
  client: SupabaseClient | null,
  boardId: string,
): Promise<BoardAccess> {
  if (!client) return { owned: false, isPublic: true };

  const { data: auth } = await client.auth.getUser();
  const userId = auth.user?.id ?? null;

  const { data: existing } = await client
    .from("boards")
    .select("id, owner_id, is_public")
    .eq("id", boardId)
    .maybeSingle();

  if (!userId) return { owned: false, isPublic: existing?.is_public ?? true };

  if (!existing) {
    // Claim ownership on first load; private by default for signed-in creators.
    const { error } = await client
      .from("boards")
      .insert({ id: boardId, owner_id: userId, is_public: false });
    if (error) {
      // A racing peer may have inserted first → re-read to settle ownership.
      const { data: row } = await client
        .from("boards")
        .select("owner_id, is_public")
        .eq("id", boardId)
        .maybeSingle();
      return {
        owned: row?.owner_id === userId,
        isPublic: row?.is_public ?? true,
      };
    }
    return { owned: true, isPublic: false };
  }

  if (existing.owner_id === userId) {
    return { owned: true, isPublic: existing.is_public };
  }

  if (existing.owner_id === null) {
    // boards_update_owner allows update while owner_id is null.
    const { error } = await client
      .from("boards")
      .update({ owner_id: userId })
      .eq("id", boardId)
      .is("owner_id", null);
    return { owned: !error, isPublic: existing.is_public };
  }

  return { owned: false, isPublic: existing.is_public }; // owned by someone else
}

// Toggle a board between private (owner-only) and public (collaborative,
// anyone with the link). Owner-only per the boards_update_owner RLS policy.
export async function setBoardVisibility(
  client: SupabaseClient | null,
  boardId: string,
  isPublic: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!client) return { ok: false, error: "Not connected." };
  const { error } = await client
    .from("boards")
    .update({ is_public: isPublic })
    .eq("id", boardId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
