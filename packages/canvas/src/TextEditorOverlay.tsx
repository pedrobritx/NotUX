import { useEffect, useRef } from "react";
import type { YText } from "@notux/types";
import { newShapeId } from "./ids";
import { useShapeStore } from "./store/shapeStore";
import { useTextEditStore } from "./store/textEditStore";
import { resolveInkColor } from "./theme/adaptiveInk";
import { useToolStore } from "./store/toolStore";
import { TextToolbar } from "./TextToolbar";
import type { ViewportState } from "./viewport/Viewport";

interface Props {
  viewport: ViewportState;
  pageId: string;
  authorId: string;
  // Matches the canvas's adaptive-ink rendering so editing is WYSIWYG.
  darkCanvas?: boolean;
}

// HTML <textarea> floated over the Konva stage with an inline formatting
// toolbar. Lifecycle:
//   1. A tool calls useTextEditStore.begin(...) with the click's world point.
//   2. This component mounts, positions itself in screen space using viewport,
//      and grabs focus.
//   3. On blur or Enter (without Shift) it commits a YText to the store.
//   4. Escape cancels without committing.
export function TextEditorOverlay({
  viewport,
  pageId,
  authorId,
  darkCanvas = false,
}: Props) {
  const session = useTextEditStore((s) => s.session);
  const endSession = useTextEditStore((s) => s.end);
  const ref = useRef<HTMLTextAreaElement>(null);
  const store = useShapeStore.getState();
  const toolStore = useToolStore.getState();

  useEffect(() => {
    if (session && session.mode !== "sticky") {
      // Defer focus so the DOM has settled after mount and the canvas
      // pointer-capture cycle from the opening click has released.
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [session]);

  // Skip rendering when in sticky mode — StickyEditorOverlay handles that.
  if (!session || session.mode === "sticky") return null;

  const left = session.worldX * viewport.scale + viewport.x;
  const top = session.worldY * viewport.scale + viewport.y;

  function commit() {
    const el = ref.current;
    if (!el || !session) return;
    const text = el.value.trim();
    if (text.length > 0) {
      const formatPatch = {
        bold: session.bold ?? false,
        italic: session.italic ?? false,
        underline: session.underline ?? false,
        align: session.align ?? ("left" as const),
      };
      if (session.editingId) {
        store.transact(() =>
          store.updateShape(pageId, session.editingId!, {
            content: text,
            font: session.font,
            size: session.size,
            ...formatPatch,
          }),
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
          ...formatPatch,
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

  // Stop pointer/mouse events from propagating to the canvas container,
  // which would otherwise capture them and blur/cancel the textarea.
  function stopProp(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  // Build inline font style matching the formatting toggles.
  const fontWeight = session.bold ? "bold" : "normal";
  const fontStyle = session.italic ? "italic" : "normal";
  const textDecoration = session.underline ? "underline" : "none";
  const textAlign = session.align ?? "left";

  return (
    <div
      style={{ position: "absolute", left, top: top - 40, zIndex: 10 }}
      onPointerDown={stopProp}
      onPointerMove={stopProp}
      onPointerUp={stopProp}
      onMouseDown={stopProp}
      onClick={stopProp}
    >
      <TextToolbar />
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
          display: "block",
          width: session.width * viewport.scale,
          minHeight: session.size * viewport.scale * 1.5,
          fontFamily: session.font,
          fontSize: session.size * viewport.scale,
          fontWeight,
          fontStyle,
          textDecoration,
          textAlign,
          color: resolveInkColor(session.color, darkCanvas),
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(90,200,250,0.6)",
          borderRadius: 6,
          padding: 4,
          margin: 0,
          resize: "none",
          outline: "none",
        }}
      />
    </div>
  );
}
