import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CanvasStage,
  DEFAULT_PAGE_ID,
  useAssetStore,
  useShapeStore,
} from "@notux/canvas";
import { SaveStatus } from "../features/canvas/SaveStatus";
import { SelectionInspector } from "../features/canvas/SelectionInspector";
import { ToolPalette } from "../features/canvas/ToolPalette";
import { useIdentity } from "../features/canvas/useIdentity";
import { getSupabase } from "../lib/supabase";

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();
  const [ready, setReady] = useState(false);
  const identity = useIdentity();

  useEffect(() => {
    if (!boardId) return;
    setReady(false);
    // Enable realtime collaboration when Supabase is configured; otherwise the
    // board runs in local-only mode against IndexedDB.
    const client = getSupabase();
    useShapeStore
      .getState()
      .configureRealtime(client ? { client, identity } : null);
    // Bytes live in Supabase Storage; import is disabled when client is null.
    useAssetStore.getState().configure({ boardId, client });
    useShapeStore
      .getState()
      .initBoard(boardId)
      .then(() => setReady(true));
  }, [boardId, identity]);

  if (!ready) {
    return (
      <div
        className="board"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          aria-label="Loading board…"
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "rgba(90,200,250,0.8)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="board">
      <CanvasStage boardId={boardId!} />
      <ToolPalette />
      <SelectionInspector pageId={DEFAULT_PAGE_ID} />
      <SaveStatus />
      <Link className="board__home-link" to="/">
        ← Home
      </Link>
    </div>
  );
}
