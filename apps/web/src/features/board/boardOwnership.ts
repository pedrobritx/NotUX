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

// Capability-token sharing (0005_security_membership.sql). Instead of flipping a
// board world-readable, the owner mints a high-entropy token bound to a role and
// expiry; only its hash is stored server-side. The raw token rides in the URL
// fragment (never sent to the server as a query param / never logged) and is
// redeemed once into a scoped membership.
export type ShareRole = "co_teach" | "draw" | "view";

const ACCESS_HASH_KEY = "access";

// Build a share URL carrying a fresh capability token in its fragment. Owner-only
// (enforced by the create_board_share RPC). Returns null when not connected or
// the mint is rejected.
export async function createShareLink(
  client: SupabaseClient | null,
  boardId: string,
  role: ShareRole = "draw",
  ttlSeconds = 7 * 24 * 60 * 60,
): Promise<{ url: string } | { error: string }> {
  if (!client) return { error: "Not connected." };
  const { data, error } = await client.rpc("create_board_share", {
    p_board_id: boardId,
    p_role: role,
    p_ttl_seconds: ttlSeconds,
  });
  if (error || !data) return { error: error?.message ?? "Could not create link." };
  const base = `${window.location.origin}${import.meta.env.BASE_URL}board/${boardId}`;
  return { url: `${base}#${ACCESS_HASH_KEY}=${data as string}` };
}

// If the current URL fragment carries a capability token, redeem it into a
// membership before the board loads, minting an anonymous guest session first
// when the visitor isn't signed in (so even an account-less student gets a
// stable id for RLS instead of relying on open public access). The token is
// stripped from the URL on success so it isn't re-shared or left in history.
export async function redeemAccessFromHash(
  client: SupabaseClient | null,
): Promise<void> {
  if (!client || typeof window === "undefined") return;
  const hash = window.location.hash.replace(/^#/, "");
  const token = new URLSearchParams(hash).get(ACCESS_HASH_KEY);
  if (!token) return;

  const { data: auth } = await client.auth.getUser();
  if (!auth.user) {
    // Anonymous sign-in must be enabled in the project's Auth settings.
    const { error } = await client.auth.signInAnonymously();
    if (error) return;
  }

  await client.rpc("redeem_share_token", { p_token: token });

  // Remove the token from the address bar / history regardless of outcome.
  const clean = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", clean);
}
