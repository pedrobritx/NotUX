import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMagicLink } from "../features/auth/useMagicLink";
import { supabaseConfigured } from "../env";

function newBoardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export default function Home() {
  const [email, setEmail] = useState("");
  const { status, error, session, sendMagicLink, signOut } = useMagicLink();
  const navigate = useNavigate();

  function onCreateBoard() {
    navigate(`/board/${newBoardId()}`);
  }

  return (
    <main className="home">
      <header className="home__hero">
        <h1>NotUX</h1>
        <p className="home__tagline">A collaborative infinite whiteboard for teaching.</p>
      </header>

      <section className="home__panel">
        <button className="lg-button lg-button--primary" onClick={onCreateBoard}>
          New board
        </button>

        {!supabaseConfigured ? (
          <p className="home__note">
            Running in local-only mode. Set <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to enable sync and sign-in.
          </p>
        ) : session ? (
          <div className="home__signed-in">
            <span>Signed in as {session.user.email}</span>
            <button className="lg-button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        ) : (
          <form
            className="home__auth"
            onSubmit={(e) => {
              e.preventDefault();
              if (email) void sendMagicLink(email);
            }}
          >
            <label htmlFor="email">Sign in for named snapshots &amp; PDF export</label>
            <div className="home__auth-row">
              <input
                id="email"
                type="email"
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="lg-button" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send magic link"}
              </button>
            </div>
            {status === "sent" && <p className="home__note">Check your email to finish signing in.</p>}
            {status === "error" && error && <p className="home__error">{error}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
