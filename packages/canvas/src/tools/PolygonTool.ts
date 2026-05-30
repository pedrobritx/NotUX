import type { YPolygon } from "@notux/types";
import { newShapeId } from "../ids";
import { dragRect } from "./dragOutGeom";
import type { Tool, ToolContext } from "./types";

function variantOf(ctx: ToolContext): YPolygon["variant"] {
  return ctx.options.shapeVariant === "triangle" ? "triangle" : "diamond";
}

// Diamond / triangle drag-out tool. Shares the box geometry of RectTool; the
// variant selects which polygon PolygonRenderer inscribes in the x/y/w/h box.
export function makePolygonTool(): Tool {
  const state: { active: boolean; start: { x: number; y: number } } = {
    active: false,
    start: { x: 0, y: 0 },
  };

  function preview(end: { x: number; y: number }, shift: boolean, ctx: ToolContext) {
    const r = dragRect(state.start, end, shift);
    ctx.draftStore.setPolygon({
      variant: variantOf(ctx),
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
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
      ctx.draftStore.setPolygon(null);
      state.active = false;
      if (r.w < 1 || r.h < 1) return;
      const shape: YPolygon = {
        id: newShapeId(),
        author: ctx.authorId,
        kind: "polygon",
        variant: variantOf(ctx),
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        rot: 0,
        stroke: ctx.options.color,
        fill: ctx.options.fill,
      };
      ctx.store.transact(() => ctx.store.addShape(ctx.pageId, shape));
    },
    onCancel(ctx) {
      state.active = false;
      ctx.draftStore.setPolygon(null);
    },
  };
}
