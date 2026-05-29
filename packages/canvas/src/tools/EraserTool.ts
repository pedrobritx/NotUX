import type { Tool, ToolContext, ToolEventPoint } from "./types";

interface State {
  active: boolean;
}

// Object eraser: while held, any shape under the pointer is deleted.
// Pixel eraser is post-M2.
export function makeEraserTool(): Tool {
  const state: State = { active: false };

  function eraseAt(p: ToolEventPoint, ctx: ToolContext) {
    const hit = ctx.hitTest({ x: p.x, y: p.y });
    if (hit && !hit.locked) {
      ctx.store.transact(() => ctx.store.deleteShape(ctx.pageId, hit.id));
    }
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
