import type { YRect } from "@notux/types";
import { newShapeId } from "../ids";
import { dragRect } from "./dragOutGeom";
import type { Tool, ToolContext } from "./types";

// Corner radius for the "rounded square" variant, scaled to the box but capped.
function cornerRadius(variant: string | undefined, w: number, h: number): number {
  if (variant !== "rounded") return 0;
  return Math.min(24, Math.min(w, h) * 0.18);
}

export function makeRectTool(): Tool {
  const state: { active: boolean; start: { x: number; y: number } } = {
    active: false,
    start: { x: 0, y: 0 },
  };

  function preview(end: { x: number; y: number }, shift: boolean, ctx: ToolContext) {
    const r = dragRect(state.start, end, shift);
    ctx.draftStore.setRect({
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      radius: cornerRadius(ctx.options.shapeVariant, r.w, r.h),
      stroke: ctx.options.color,
      fill: ctx.options.fill,
    });
  }

  return {
    cursor: "crosshair",
    onPointerDown(p, _ctx) {
      state.active = true;
      state.start = { x: p.x, y: p.y };
    },
    onPointerMove(p, ctx) {
      if (!state.active) return;
      preview({ x: p.x, y: p.y }, p.shift, ctx);
    },
    onPointerUp(p, ctx) {
      if (!state.active) return;
      const r = dragRect(state.start, { x: p.x, y: p.y }, p.shift);
      ctx.draftStore.setRect(null);
      state.active = false;
      if (r.w < 1 || r.h < 1) return;
      const shape: YRect = {
        id: newShapeId(),
        author: ctx.authorId,
        kind: "rect",
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        rot: 0,
        radius: cornerRadius(ctx.options.shapeVariant, r.w, r.h),
        stroke: ctx.options.color,
        fill: ctx.options.fill,
        strokeWidth: ctx.options.size,
      };
      ctx.store.transact(() => ctx.store.addShape(ctx.pageId, shape));
    },
    onCancel(ctx) {
      state.active = false;
      ctx.draftStore.setRect(null);
    },
  };
}
