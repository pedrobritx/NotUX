import { Link, useParams } from "react-router-dom";
import { CanvasStage } from "@notux/canvas";
import { ToolPalette } from "../features/canvas/ToolPalette";

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();

  return (
    <div className="board">
      <CanvasStage boardId={boardId ?? "unknown"} />
      <ToolPalette />
      <Link className="board__home-link" to="/">
        ← Home
      </Link>
    </div>
  );
}
