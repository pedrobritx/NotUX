import { useMemo } from "react";
import { colorForSeed } from "@notux/sync";
import { useMagicLink } from "../auth/useMagicLink";

export interface Identity {
  name: string;
  color: string;
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

// Presence identity: the signed-in user's email local-part, or "Guest". The
// color is deterministic from a stable seed so the same person is the same
// color across all clients.
export function useIdentity(): Identity {
  const { session } = useMagicLink();
  return useMemo(() => {
    const email = session?.user?.email ?? null;
    const name = email ? (email.split("@")[0] ?? email) : "Guest";
    const seed = session?.user?.id ?? guestSeed();
    return { name, color: colorForSeed(seed) };
  }, [session]);
}
