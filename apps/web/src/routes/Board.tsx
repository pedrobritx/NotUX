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
import { CollabBar } from "../features/canvas/CollabBar";
import { Dock } from "../features/canvas/Dock";
import { FollowPill } from "../features/canvas/FollowPill";
import { SaveStatus } from "../features/canvas/SaveStatus";
import { SelectionToolbar } from "../features/canvas/SelectionToolbar";
import { useIdentity } from "../features/canvas/useIdentity";
import {
  ensureBoardOwnership,
  redeemAccessFromHash,
} from "../features/board/boardOwnership";
import { useLibraryStore } from "../features/library/libraryStore";
import { getSupabase } from "../lib/supabase";
import { env } from "../env";

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();
  const [ready, setReady] = useState(false);
  const [owned, setOwned] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const identity = useIdentity();
  const client = getSupabase();
  const activePageId = usePageStore((s) => s.activePageId);
  const { theme } = useTheme();

  // Index the visit so the board shows up in Home's library/recents.
  useEffect(() => {
    if (boardId) useLibraryStore.getState().touchBoard(boardId);
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    setReady(false);
    setOwned(false);
    let cancelled = false;
    void (async () => {
      // Redeem a capability token from the URL fragment (and mint a guest
      // session if needed) BEFORE any board read, so membership-gated RLS lets
      // this client load assets/snapshots and join the realtime channel.
      await redeemAccessFromHash(client);
      if (cancelled) return;
      // Enable realtime collaboration when Supabase is configured; otherwise the
      // board runs in local-only mode against IndexedDB.
      useShapeStore
        .getState()
        .configureRealtime(
          client
            ? { client, identity, privateChannel: env.realtimePrivate }
            : null,
        );
      // Bytes live in Supabase Storage; import is disabled when client is null.
      useAssetStore.getState().configure({ boardId, client });
      await useShapeStore.getState().initBoard(boardId);
      if (cancelled) return;
      // Seed/migrate the page list against the IndexedDB-hydrated doc.
      usePageStore.getState().initPages(boardId);
      useSettingsStore.getState().initSettings(boardId);
      setReady(true);
      // Claim board ownership when signed in — gates named snapshots.
      const r = await ensureBoardOwnership(client, boardId);
      if (cancelled) return;
      setOwned(r.owned);
      setIsPublic(r.isPublic);
    })();
    return () => {
      cancelled = true;
    };
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
      <CollabBar
        boardId={boardId!}
        client={client}
        owned={owned}
        isPublic={isPublic}
        identity={identity}
      />
      <FollowPill />
      <Dock />
      <SelectionToolbar pageId={activePageId} />
      <SaveStatus />
    </div>
  );
}
