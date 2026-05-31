import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { LOCAL_ORIGIN } from "@notux/sync";
import { useShapeStore } from "../store/shapeStore";

// Board-wide, per-user undo. One UndoManager tracks the two top-level board
// containers — the per-page shape maps (getMap("pages")) and the ordered page
// list (getArray("pageList")) — so shape edits on every page AND page-list
// operations share a single history that survives page switches. (A Y.UndoManager
// tracking a parent Y.Map also captures changes to the Y.Maps nested inside it.)
//
// trackedOrigins is exactly { LOCAL_ORIGIN }: every user-initiated mutation
// transacts with that origin (see shapeStore + pageList), while remote edits
// (SupabaseProvider instance), IndexedDB hydration (its provider), and the seed
// page (null) carry other origins and are never captured — making undo strictly
// per-user in multiplayer. captureTimeout coalesces rapid same-origin writes
// (e.g. a drag emitting many updates) into one undo step.
export function useUndoManager(): {
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const doc = useShapeStore((s) => s._doc);
  const managerRef = useRef<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!doc) return;

    const manager = new Y.UndoManager(
      [doc.getMap("pages"), doc.getArray("pageList")],
      { trackedOrigins: new Set([LOCAL_ORIGIN]), captureTimeout: 300 },
    );
    managerRef.current = manager;

    function update() {
      setCanUndo(manager.undoStack.length > 0);
      setCanRedo(manager.redoStack.length > 0);
    }

    manager.on("stack-item-added", update);
    manager.on("stack-item-popped", update);
    manager.on("stack-cleared", update);

    return () => {
      manager.off("stack-item-added", update);
      manager.off("stack-item-popped", update);
      manager.off("stack-cleared", update);
      manager.destroy();
      managerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };
  }, [doc]);

  const undo = useCallback(() => managerRef.current?.undo(), []);
  const redo = useCallback(() => managerRef.current?.redo(), []);

  return { undo, redo, canUndo, canRedo };
}
