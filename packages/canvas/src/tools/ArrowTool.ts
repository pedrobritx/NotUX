import type { YArrow } from "@notux/types";
import { newShapeId } from "../ids";
import { dragLine } from "./dragOutGeom";
import type { Tool, ToolContext } from "./types";

export function makeArrowTool(): Tool {
  const state: { active: boolean; start: { x: number; y: number } } = {
    active: false,
    start: { x: 0, y: 0 },
  };

  function variantOf(ctx: ToolContext): "straight" | "curved" | "elbow" {
    const v = ctx.options.shapeVariant;
    return v === "curved" || v === "elbow" ? v : "straight";
  }

  function preview(end: { x: number; y: number }, shift: boolean, ctx: ToolContext) {
    const l = dragLine(state.start, end, shift);
    ctx.draftStore.setArrow({
      ...l,
      stroke: ctx.options.color,
      width: ctx.options.size,
      variant: variantOf(ctx),
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
      const l = dragLine(state.start, { x: p.x, y: p.y }, p.shift);
      ctx.draftStore.setArrow(null);
      state.active = false;
      if (Math.hypot(l.x2 - l.x1, l.y2 - l.y1) < 1) return;
      const shape: YArrow = {
        id: newShapeId(),
        author: ctx.authorId,
        kind: "arrow",
        ...l,
        stroke: ctx.options.color,
        width: ctx.options.size,
        variant: variantOf(ctx),
      };
      ctx.store.transact(() => ctx.store.addShape(ctx.pageId, shape));
    },
    onCancel(ctx) {
      state.active = false;
      ctx.draftStore.setArrow(null);
    },
  };
}
