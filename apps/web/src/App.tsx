import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./routes/Landing";
import Login from "./routes/Login";
import Dashboard from "./routes/Dashboard";
import Board from "./routes/Board";
import AuthCallback from "./routes/AuthCallback";
import { RequireApp } from "./features/auth/RequireApp";

// Flow: Landing (/) → Login (/login) → Dashboard (/app) → Board (/board/:id).
// The dashboard is gated behind sign-in (or an explicit guest choice / local
// mode); board pages stay open so shared capability links keep working for
// recipients who aren't signed in.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <RequireApp>
            <Dashboard />
          </RequireApp>
        }
      />
      <Route path="/board/:boardId" element={<Board />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
