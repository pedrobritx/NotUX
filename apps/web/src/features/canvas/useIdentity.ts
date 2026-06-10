import { useMemo } from "react";
import { colorForSeed } from "@notux/sync";
import { useAuth } from "../auth/useAuth";

export interface Identity {
  name: string;
  color: string;
  avatarUrl: string | null;
}

// A stable per-tab id for anonymous guests, so a signed-out user keeps one
// consistent name color for the session.
function guestSeed(): string {
  const KEY = "notux-guest-id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2);
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

// Presence identity: a signed-in user's display name (Google full name, else
// email local-part), or "Guest". The color is deterministic from a stable seed
// so the same person is the same color across all clients. Avatar, when present
// (Google), rides along for collaborator cursors. This is derived entirely from
// the user's own session — never from another user's profile row — so account
// info stays private to its owner.
export function useIdentity(): Identity {
  const { session } = useAuth();
  return useMemo(() => {
    const user = session?.user ?? null;
    const meta = (user?.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
      avatar_url?: string;
    };
    const email = user?.email ?? null;
    const name =
      meta.full_name ??
      meta.name ??
      (email ? (email.split("@")[0] ?? email) : "Guest");
    const seed = user?.id ?? guestSeed();
    return { name, color: colorForSeed(seed), avatarUrl: meta.avatar_url ?? null };
  }, [session]);
}
