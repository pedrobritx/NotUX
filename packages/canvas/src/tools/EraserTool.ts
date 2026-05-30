import { splitStrokeByEraser } from "./eraseGeom";
import type { Tool, ToolContext, ToolEventPoint } from "./types";

interface State {
  active: boolean;
}

// Eraser with two modes (set via options.eraserMode):
//   "object" — any shape under the pointer is deleted whole.
//   "area"   — strokes are trimmed/split where the tip passes; other shapes
//              touched by the tip are deleted whole (vectors can't partial-erase).
export function makeEraserTool(): Tool {
  const state: State = { active: false };

  function eraseObjectAt(p: ToolEventPoint, ctx: ToolContext) {
    const hit = ctx.hitTest({ x: p.x, y: p.y });
    if (hit && !hit.locked) {
      ctx.store.transact(() => ctx.store.deleteShape(ctx.pageId, hit.id));
    }
  }

  function eraseAreaAt(p: ToolEventPoint, ctx: ToolContext) {
    const r = Math.max(2, ctx.options.size / 2);
    const box = { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
    const candidates = ctx.rectIntersect(box).filter((s) => !s.locked);
    if (candidates.length === 0) return;
    ctx.store.transact(() => {
      for (const shape of candidates) {
        if (shape.kind === "stroke") {
          const { changed, pieces } = splitStrokeByEraser(shape, p.x, p.y, r);
          if (!changed) continue;
          ctx.store.deleteShape(ctx.pageId, shape.id);
          for (const piece of pieces) ctx.store.addShape(ctx.pageId, piece);
        } else {
          // Non-stroke vectors can't be partially erased — remove if the tip is
          // actually over them (not just within the bbox).
          const hit = ctx.hitTest({ x: p.x, y: p.y });
          if (hit && hit.id === shape.id) ctx.store.deleteShape(ctx.pageId, shape.id);
        }
      }
    });
  }

  function eraseAt(p: ToolEventPoint, ctx: ToolContext) {
    if (ctx.options.eraserMode === "area") eraseAreaAt(p, ctx);
    else eraseObjectAt(p, ctx);
  }

  return {
    cursor: "cell",
    onPointerDown(p, ctx) {
      state.active = true;
      eraseAt(p, ctx);
    },
    onPointerMove(p, ctx) {
      if (!state.active) return;
      eraseAt(p, ctx);
    },
    onPointerUp(_p, _ctx) {
      state.active = false;
    },
    onCancel(_ctx) {
      state.active = false;
    },
  };
}
