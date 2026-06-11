import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CanvasStage,
  useAssetStore,
  usePageStore,
  useSettingsStore,
  useShapeStore,
} from "@notux/canvas";
import { useTheme } from "@notux/ui";
import { AppMenu } from "../features/canvas/AppMenu";
import { Dock } from "../features/canvas/Dock";
import { SaveStatus } from "../features/canvas/SaveStatus";
import { SelectionInspector } from "../features/canvas/SelectionInspector";
import { useIdentity } from "../features/canvas/useIdentity";
import { ensureBoardOwnership } from "../features/board/boardOwnership";
import { BoardAccessIndicator } from "../features/board/BoardAccessIndicator";
import { getSupabase } from "../lib/supabase";

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();
  const [ready, setReady] = useState(false);
  const [owned, setOwned] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const identity = useIdentity();
  const client = getSupabase();
  const activePageId = usePageStore((s) => s.activePageId);
  const { theme } = useTheme();

  useEffect(() => {
    if (!boardId) return;
    setReady(false);
    setOwned(false);
    // Enable realtime collaboration when Supabase is configured; otherwise the
    // board runs in local-only mode against IndexedDB.
    useShapeStore
      .getState()
      .configureRealtime(client ? { client, identity } : null);
    // Bytes live in Supabase Storage; import is disabled when client is null.
    useAssetStore.getState().configure({ boardId, client });
    useShapeStore
      .getState()
      .initBoard(boardId)
      .then(() => {
        // Seed/migrate the page list against the IndexedDB-hydrated doc.
        usePageStore.getState().initPages(boardId);
        useSettingsStore.getState().initSettings(boardId);
        setReady(true);
        // Claim board ownership when signed in — gates named snapshots.
        void ensureBoardOwnership(client, boardId).then((r) => {
          setOwned(r.owned);
          setIsPublic(r.isPublic);
        });
      });
  }, [boardId, identity, client]);

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
      <CanvasStage boardId={boardId!} pageId={activePageId} theme={theme} />
      <AppMenu boardId={boardId!} client={client} owned={owned} />
      <BoardAccessIndicator
        client={client}
        boardId={boardId!}
        owned={owned}
        isPublic={isPublic}
      />
      <Dock />
      <SelectionInspector pageId={activePageId} />
      <SaveStatus />
    </div>
  );
}
