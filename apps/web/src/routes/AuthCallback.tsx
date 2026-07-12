import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) {
      navigate("/app", { replace: true });
      return;
    }
    // Wait for Supabase to parse the OAuth/magic-link fragment into a session,
    // then land the user in their workspace.
    void supa.auth.getSession().then(() => {
      navigate("/app", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="app-loading" role="status" aria-label="Signing you in">
      <span className="app-loading__spinner" />
      <p className="app-loading__label">Signing you in…</p>
    </div>
  );
}
