import { Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import Board from "./routes/Board";
import AuthCallback from "./routes/AuthCallback";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board/:boardId" element={<Board />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}
