import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";

type Status = "idle" | "sending" | "sent" | "error";

export function useMagicLink() {
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

  const sendMagicLink = useCallback(async (email: string) => {
    const supa = getSupabase();
    if (!supa) {
      setStatus("error");
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setStatus("sending");
    setError(null);
    const { error: err } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback` },
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

  return { status, error, session, sendMagicLink, signOut };
}
