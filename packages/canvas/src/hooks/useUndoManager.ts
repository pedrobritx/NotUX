import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { getPageMap } from "@notux/sync";
import { useShapeStore } from "../store/shapeStore";

export function useUndoManager(pageId: string): {
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

    const pageMap = getPageMap(doc, pageId);
    const manager = new Y.UndoManager(pageMap);
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
  }, [doc, pageId]);

  const undo = useCallback(() => managerRef.current?.undo(), []);
  const redo = useCallback(() => managerRef.current?.redo(), []);

  return { undo, redo, canUndo, canRedo };
}
