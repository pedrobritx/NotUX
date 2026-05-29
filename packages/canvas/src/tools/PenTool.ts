import type { StrokeStyle, YStroke } from "@notux/types";
import { newShapeId } from "../ids";
import type { Tool, ToolContext, ToolEventPoint } from "./types";

interface State {
  active: boolean;
  points: number[];
  pressure: number[];
}

// PenTool also drives the highlighter — the discriminator is `tool`, while the
// finer `style` (pen / fineliner / pencil / marker) comes from the dock via
// ToolOptions and only affects rendering. Opacity is written per-stroke so the
// dock's opacity control is honored (highlighter still defaults to 0.35 when no
// explicit opacity flows through).
export function makePenTool(tool: "pen" | "highlighter"): Tool {
  const state: State = { active: false, points: [], pressure: [] };

  function reset(ctx: ToolContext) {
    state.active = false;
    state.points = [];
    state.pressure = [];
    ctx.draftStore.setStroke(null);
  }

  function pushPoint(p: ToolEventPoint) {
    state.points.push(p.x, p.y);
    state.pressure.push(p.pressure);
  }

  function styleFor(ctx: ToolContext): StrokeStyle {
    return tool === "highlighter" ? "highlighter" : ctx.options.style;
  }

  function paintDraft(ctx: ToolContext) {
    ctx.draftStore.setStroke({
      tool,
      style: styleFor(ctx),
      color: ctx.options.color,
      size: ctx.options.size,
      opacity: ctx.options.opacity,
      points: state.points,
      pressure: state.pressure,
    });
  }

  return {
    cursor: "crosshair",
    onPointerDown(p, ctx) {
      state.active = true;
      state.points = [p.x, p.y];
      state.pressure = [p.pressure];
      paintDraft(ctx);
    },
    onPointerMove(p, ctx) {
      if (!state.active) return;
      pushPoint(p);
      paintDraft(ctx);
    },
    onPointerUp(p, ctx) {
      if (!state.active) return;
      pushPoint(p);
      const shape: YStroke = {
        id: newShapeId(),
        author: ctx.authorId,
        kind: "stroke",
        tool,
        style: styleFor(ctx),
        color: ctx.options.color,
        size: ctx.options.size,
        opacity: ctx.options.opacity,
        points: state.points,
        pressure: state.pressure,
      };
      ctx.store.transact(() => {
        ctx.store.addShape(ctx.pageId, shape);
      });
      reset(ctx);
    },
    onCancel(ctx) {
      reset(ctx);
    },
  };
}
