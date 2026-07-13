import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";
import { supabaseConfigured } from "../../env";

type Status = "idle" | "sending" | "sent" | "error";

const NOT_CONFIGURED =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

const GUEST_KEY = "notux-guest-mode";

function callbackUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;
}

export interface SessionContextValue {
  /** The Supabase session, or null when signed out / unconfigured. */
  session: Session | null;
  /** True until the initial session lookup resolves (avoids UI flashes/races). */
  loading: boolean;
  /** Whether Supabase auth is available at all. */
  configured: boolean;
  /** User chose to use the app without an account. */
  isGuest: boolean;
  /** True when the app can proceed: signed in, guest, or unconfigured. */
  canUseApp: boolean;
  status: Status;
  error: string | null;
  continueAsGuest(): void;
  signInWithGoogle(): Promise<void>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Single source of truth for auth across the whole app. One subscription to
// Supabase's auth state feeds every screen, and an initial `loading` flag lets
// routes wait for the session to resolve before deciding where to send the user.
// When Supabase is unconfigured (or the user opts out) the app runs fully in
// local-only mode.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(GUEST_KEY) === "1";
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const supa = getSupabase();
    if (!supa) {
      setLoading(false);
      return;
    }
    void supa.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supa.auth.onAuthStateChange((_event, s) => {
      if (!mounted.current) return;
      setSession(s);
      setLoading(false);
    });
    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = useCallback(() => {
    try {
      window.localStorage.setItem(GUEST_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setIsGuest(true);
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
    try {
      window.localStorage.removeItem(GUEST_KEY);
    } catch {
      /* storage unavailable */
    }
    setIsGuest(false);
    const supa = getSupabase();
    if (supa) await supa.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      loading,
      configured: supabaseConfigured,
      isGuest,
      canUseApp: !supabaseConfigured || isGuest || session !== null,
      status,
      error,
      continueAsGuest,
      signInWithGoogle,
      sendMagicLink,
      signOut,
    }),
    [
      session,
      loading,
      isGuest,
      status,
      error,
      continueAsGuest,
      signInWithGoogle,
      sendMagicLink,
      signOut,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
