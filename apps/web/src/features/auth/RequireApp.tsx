import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "./SessionProvider";

// Gates the dashboard: waits for the initial session lookup, then either lets
// the user through (signed in, guest, or local-only mode) or bounces them to
// the login screen. Rendering nothing meaningful until `loading` clears avoids
// the flash-then-redirect that makes auth feel broken.
export function RequireApp({ children }: { children: ReactNode }) {
  const { loading, canUseApp } = useSession();

  if (loading) {
    return (
      <div className="app-loading" role="status" aria-label="Loading">
        <span className="app-loading__spinner" />
      </div>
    );
  }

  if (!canUseApp) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
