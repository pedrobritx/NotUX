import type { YSticky } from "@notux/types";
import { newShapeId } from "../ids";
import { useTextEditStore } from "../store/textEditStore";
import { useToolStore } from "../store/toolStore";
import { dragRect } from "./dragOutGeom";
import type { Tool, ToolContext } from "./types";

const DEFAULT_SIZE = 180;
const MIN_SIZE = 60;
const PAD = 14;
const FONT = "-apple-system, system-ui, sans-serif";
const FONT_SIZE = 18;

// Sticky note: click to drop a default note, or drag to size one, then open the
// text editor on it (reusing the YText overlay, which patches `content`).
export function makeStickyTool(): Tool {
  const state: { active: boolean; start: { x: number; y: number } } = {
    active: false,
    start: { x: 0, y: 0 },
  };

  function place(end: { x: number; y: number }, ctx: ToolContext) {
    const r = dragRect(state.start, end, false);
    // A click (or tiny drag) drops a default-sized note centered on the point.
    const sized = r.w >= MIN_SIZE || r.h >= MIN_SIZE;
    const w = sized ? r.w : DEFAULT_SIZE;
    const h = sized ? r.h : DEFAULT_SIZE;
    const x = sized ? r.x : state.start.x - w / 2;
    const y = sized ? r.y : state.start.y - h / 2;

    const shape: YSticky = {
      id: newShapeId(),
      author: ctx.authorId,
      kind: "sticky",
      x,
      y,
      w,
      h,
      rot: 0,
      color: ctx.options.stickyColor,
      content: "",
      fontSize: FONT_SIZE,
    };
    ctx.store.transact(() => ctx.store.addShape(ctx.pageId, shape));

    // Open the inline sticky editor (FigJam-style) anchored over the note.
    useTextEditStore.getState().begin({
      editingId: shape.id,
      worldX: x,
      worldY: y,
      width: w,
      initial: "",
      font: FONT,
      size: FONT_SIZE,
      color: "#1c1c1e",
      mode: "sticky",
      stickyColor: ctx.options.stickyColor,
      stickyW: w,
      stickyH: h,
    });
  }

  return {
    cursor: "crosshair",
    onPointerDown(p, _ctx) {
      state.active = true;
      state.start = { x: p.x, y: p.y };
    },
    onPointerMove(_p, _ctx) {
      // No live preview; the note appears on release.
    },
    onPointerUp(p, ctx) {
      if (!state.active) return;
      state.active = false;
      place({ x: p.x, y: p.y }, ctx);
      // Return to select so the new note can be moved/edited immediately.
      useToolStore.getState().setTool("select");
    },
    onCancel(_ctx) {
      state.active = false;
    },
  };
}
