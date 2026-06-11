import { useEffect, useRef } from "react";
import { useShapeStore } from "./store/shapeStore";
import { useTextEditStore } from "./store/textEditStore";
import { useToolStore } from "./store/toolStore";
import type { ViewportState } from "./viewport/Viewport";

interface Props {
  viewport: ViewportState;
  pageId: string;
}

// Choose readable text ink for a given note color (dark text on light notes).
function inkFor(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m || !m[1]) return "#1c1c1e";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1c1c1e" : "#ffffff";
}

/**
 * FigJam-style inline sticky note editor. Positions a contenteditable div
 * exactly over the sticky's screen-space rectangle, matching its background
 * color so the user types "directly on" the note — no dark box.
 */
export function StickyEditorOverlay({ viewport, pageId }: Props) {
  const session = useTextEditStore((s) => s.session);
  const endSession = useTextEditStore((s) => s.end);
  const ref = useRef<HTMLDivElement>(null);
  const store = useShapeStore.getState();
  const toolStore = useToolStore.getState();

  useEffect(() => {
    if (session?.mode === "sticky") {
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        // Move cursor to end of existing content.
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
    }
  }, [session]);

  if (!session || session.mode !== "sticky") return null;

  const bgColor = session.stickyColor ?? "#ffe066";
  const textColor = inkFor(bgColor);
  const scale = viewport.scale;

  const left = session.worldX * scale + viewport.x;
  const top = session.worldY * scale + viewport.y;
  const width = (session.stickyW ?? session.width) * scale;
  const height = (session.stickyH ?? session.size * 8) * scale;

  function commit() {
    const el = ref.current;
    if (!el || !session) return;
    const text = (el.innerText || "").trim();
    if (text.length > 0) {
      if (session.editingId) {
        store.transact(() =>
          store.updateShape(pageId, session.editingId!, { content: text }),
        );
      }
    } else if (session.editingId) {
      // If the user cleared all text, keep the sticky but with empty content.
      store.transact(() =>
        store.updateShape(pageId, session.editingId!, { content: "" }),
      );
    }
    endSession();
    toolStore.setTool("select");
  }

  function stopProp(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  const PAD = 14 * scale;

  return (
    <div
      className="sticky-editor"
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        background: bgColor,
        borderRadius: 6 * scale,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        zIndex: 10,
        overflow: "hidden",
      }}
      onPointerDown={stopProp}
      onPointerMove={stopProp}
      onPointerUp={stopProp}
      onMouseDown={stopProp}
      onClick={stopProp}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="sticky-editor__content"
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            commit();
          }
        }}
        style={{
          position: "absolute",
          top: PAD,
          left: PAD,
          right: PAD,
          bottom: PAD,
          fontFamily: "-apple-system, system-ui, sans-serif",
          fontSize: session.size * scale,
          lineHeight: 1.3,
          color: textColor,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
        {session.initial}
      </div>
    </div>
  );
}
