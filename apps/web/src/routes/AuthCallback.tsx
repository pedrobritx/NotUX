import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) {
      navigate("/", { replace: true });
      return;
    }
    void supa.auth.getSession().then(() => {
      navigate("/", { replace: true });
    });
  }, [navigate]);

  return (
    <main className="auth-callback">
      <p>Signing you in…</p>
    </main>
  );
}
