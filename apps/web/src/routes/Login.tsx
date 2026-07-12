import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, useTheme } from "@notux/ui";
import { useSession } from "../features/auth/SessionProvider";
import { GoogleIcon } from "../components/GoogleIcon";

export default function Login() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    session,
    loading,
    configured,
    isGuest,
    status,
    error,
    continueAsGuest,
    signInWithGoogle,
    sendMagicLink,
  } = useSession();
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  // If the user has already made a choice (signed in, or previously opted into
  // guest mode) skip the screen. A first visit always shows it, so the login
  // step is a real part of the flow rather than something silently bypassed.
  useEffect(() => {
    if (!loading && (session || isGuest)) {
      navigate("/app", { replace: true });
    }
  }, [loading, session, isGuest, navigate]);

  function onGuest() {
    continueAsGuest();
    navigate("/app", { replace: true });
  }

  return (
    <div className="auth-screen">
      <button
        type="button"
        className="auth-screen__theme"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      </button>

      <button
        type="button"
        className="auth-screen__back"
        onClick={() => navigate("/")}
      >
        <Icon name="chevron-left" size={15} />
        <span>Home</span>
      </button>

      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="auth-card__logo" aria-hidden>
            N
          </span>
          <span className="auth-card__wordmark">NotUX</span>
        </div>

        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__sub">
          Sign in to keep your boards private and synced across devices.
        </p>

        {configured ? (
          <>
            <button
              type="button"
              className="lg-button lg-button--google auth-card__google"
              onClick={() => void signInWithGoogle()}
            >
              <GoogleIcon /> Continue with Google
            </button>

            {!showEmail ? (
              <button
                type="button"
                className="lg-button auth-card__wide"
                onClick={() => setShowEmail(true)}
              >
                Continue with email
              </button>
            ) : (
              <form
                className="auth-card__email"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) void sendMagicLink(email);
                }}
              >
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                  className="auth-card__input"
                />
                <button
                  className="lg-button lg-button--primary auth-card__wide"
                  type="submit"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "Sending…" : "Send magic link"}
                </button>
              </form>
            )}

            {status === "sent" && (
              <p className="auth-card__note">
                Check your email for a sign-in link.
              </p>
            )}
            {status === "error" && error && (
              <p className="auth-card__error">{error}</p>
            )}

            <div className="auth-card__divider">
              <span>or</span>
            </div>
          </>
        ) : (
          <p className="auth-card__note">
            Sign-in isn't configured on this deployment. You can still use NotUX
            locally — boards are saved in this browser.
          </p>
        )}

        <button
          type="button"
          className="auth-card__guest"
          onClick={onGuest}
        >
          Continue without an account
        </button>
      </div>

      <p className="auth-screen__legal">
        No tracking, no ads. Your boards stay yours.
      </p>
    </div>
  );
}
