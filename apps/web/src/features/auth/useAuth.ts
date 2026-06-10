import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";

type Status = "idle" | "sending" | "sent" | "error";

const NOT_CONFIGURED =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

function callbackUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;
}

// Single source of truth for auth: tracks the session and exposes Google OAuth
// and email magic-link sign-in. Both providers funnel through Supabase, which
// persists the session to localStorage and refreshes tokens automatically;
// when Supabase is unconfigured every action degrades gracefully so the board
// keeps working in local-only mode.
export function useAuth() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) return;
    void supa.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supa.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supa = getSupabase();
    if (!supa) {
      setStatus("error");
      setError(NOT_CONFIGURED);
      return;
    }
    setError(null);
    const { error: err } = await supa.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (err) {
      setStatus("error");
      setError(err.message);
    }
    // On success the browser is redirected to Google; no further state needed.
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const supa = getSupabase();
    if (!supa) {
      setStatus("error");
      setError(NOT_CONFIGURED);
      return;
    }
    setStatus("sending");
    setError(null);
    const { error: err } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (err) {
      setStatus("error");
      setError(err.message);
    } else {
      setStatus("sent");
    }
  }, []);

  const signOut = useCallback(async () => {
    const supa = getSupabase();
    if (!supa) return;
    await supa.auth.signOut();
  }, []);

  return { status, error, session, signInWithGoogle, sendMagicLink, signOut };
}
