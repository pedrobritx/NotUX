import { Link, useParams } from "react-router-dom";

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();

  return (
    <div className="board">
      <div className="board__canvas-placeholder">
        <div className="board__id-pill">board · {boardId}</div>
      </div>
      <div className="board__dock-stub" aria-hidden>
        Dock coming in M7
      </div>
      <Link className="board__home-link" to="/">
        ← Home
      </Link>
    </div>
  );
}
