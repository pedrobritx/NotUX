import { useEffect, useRef } from "react";
import type { YText } from "@notux/types";
import { newShapeId } from "./ids";
import { useShapeStore } from "./store/shapeStore";
import { useTextEditStore } from "./store/textEditStore";
import { useToolStore } from "./store/toolStore";
import type { ViewportState } from "./viewport/Viewport";

interface Props {
  viewport: ViewportState;
  pageId: string;
  authorId: string;
}

// HTML <textarea> floated over the Konva stage. Lifecycle:
//   1. A tool calls useTextEditStore.begin(...) with the click's world point.
//   2. This component mounts, positions itself in screen space using viewport,
//      and grabs focus.
//   3. On blur or Enter (without Shift) it commits a YText to the store.
//   4. Escape cancels without committing.
export function TextEditorOverlay({ viewport, pageId, authorId }: Props) {
  const session = useTextEditStore((s) => s.session);
  const endSession = useTextEditStore((s) => s.end);
  const ref = useRef<HTMLTextAreaElement>(null);
  const store = useShapeStore.getState();
  const toolStore = useToolStore.getState();

  useEffect(() => {
    if (session) ref.current?.focus();
  }, [session]);

  if (!session) return null;

  const left = session.worldX * viewport.scale + viewport.x;
  const top = session.worldY * viewport.scale + viewport.y;

  function commit() {
    const el = ref.current;
    if (!el || !session) return;
    const text = el.value.trim();
    if (text.length > 0) {
      if (session.editingId) {
        store.transact(() =>
          store.updateShape(pageId, session.editingId!, { content: text }),
        );
      } else {
        const shape: YText = {
          id: newShapeId(),
          author: authorId,
          kind: "text",
          x: session.worldX,
          y: session.worldY,
          w: session.width,
          h: session.size * 1.5,
          content: text,
          font: session.font,
          size: session.size,
          color: session.color,
        };
        store.transact(() => store.addShape(pageId, shape));
      }
    } else if (session.editingId) {
      // Empty edit on an existing shape removes it.
      store.transact(() => store.deleteShape(pageId, session.editingId!));
    }
    endSession();
    // Return to select after a text edit so the user can keep arranging.
    toolStore.setTool("select");
  }

  return (
    <textarea
      ref={ref}
      defaultValue={session.initial}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          endSession();
        }
      }}
      style={{
        position: "absolute",
        left,
        top,
        width: session.width * viewport.scale,
        minHeight: session.size * viewport.scale * 1.5,
        font: `${session.size * viewport.scale}px ${session.font}`,
        color: session.color,
        textAlign: session.align ?? "left",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(90,200,250,0.6)",
        borderRadius: 6,
        padding: 4,
        margin: 0,
        resize: "none",
        outline: "none",
        zIndex: 10,
      }}
    />
  );
}
