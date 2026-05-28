import type { YStroke } from "@notux/types";
import { newShapeId } from "../ids";
import type { Tool, ToolContext, ToolEventPoint } from "./types";

interface State {
  active: boolean;
  points: number[];
  pressure: number[];
}

// PenTool also drives the highlighter — the only difference is opacity, which
// the renderer picks up from YStroke.tool. Passing tool: "highlighter" lets one
// implementation back both ToolKinds.
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

  return {
    cursor: tool === "highlighter" ? "crosshair" : "crosshair",
    onPointerDown(p, ctx) {
      state.active = true;
      state.points = [p.x, p.y];
      state.pressure = [p.pressure];
      ctx.draftStore.setStroke({
        tool,
        color: ctx.options.color,
        size: ctx.options.size * (tool === "highlighter" ? 4 : 1),
        points: state.points,
        pressure: state.pressure,
      });
    },
    onPointerMove(p, ctx) {
      if (!state.active) return;
      pushPoint(p);
      ctx.draftStore.setStroke({
        tool,
        color: ctx.options.color,
        size: ctx.options.size * (tool === "highlighter" ? 4 : 1),
        points: state.points,
        pressure: state.pressure,
      });
    },
    onPointerUp(p, ctx) {
      if (!state.active) return;
      pushPoint(p);
      const shape: YStroke = {
        id: newShapeId(),
        author: ctx.authorId,
        kind: "stroke",
        tool,
        color: ctx.options.color,
        size: ctx.options.size * (tool === "highlighter" ? 4 : 1),
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
