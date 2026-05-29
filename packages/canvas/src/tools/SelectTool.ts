import type { YShape } from "@notux/types";
import { useTextEditStore } from "../store/textEditStore";
import { boundsIntersect, shapeBounds, translateShape } from "./shapeOps";
import type { Tool, ToolContext, ToolEventPoint } from "./types";

type Mode = "idle" | "drag" | "marquee";

interface State {
  mode: Mode;
  start: { x: number; y: number };
  last: { x: number; y: number };
  // Snapshot of shapes at drag start, so translation is from the original
  // position rather than compounding rounding error each pointermove.
  dragSnapshot: Map<string, YShape>;
}

export function makeSelectTool(): Tool {
  const state: State = {
    mode: "idle",
    start: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
    dragSnapshot: new Map(),
  };

  function snapshotSelection(ctx: ToolContext) {
    state.dragSnapshot.clear();
    for (const id of ctx.getSelection()) {
      const s = ctx.store.getShape(ctx.pageId, id);
      // Locked shapes are never dragged, even within a mixed selection.
      if (s && !s.locked) state.dragSnapshot.set(id, s);
    }
  }

  function applyDrag(p: ToolEventPoint, ctx: ToolContext) {
    const dx = p.x - state.start.x;
    const dy = p.y - state.start.y;
    ctx.store.transact(() => {
      for (const [id, original] of state.dragSnapshot) {
        const moved = translateShape(original, dx, dy);
        ctx.store.updateShape(ctx.pageId, id, moved);
      }
    });
  }

  return {
    cursor: "default",
    onPointerDown(p, ctx) {
      state.start = { x: p.x, y: p.y };
      state.last = { x: p.x, y: p.y };
      const hit = ctx.hitTest({ x: p.x, y: p.y });
      if (hit) {
        const selection = ctx.getSelection();
        if (p.shift) {
          const next = new Set(selection);
          if (next.has(hit.id)) next.delete(hit.id);
          else next.add(hit.id);
          ctx.setSelection(next);
        } else if (!selection.has(hit.id)) {
          ctx.setSelection([hit.id]);
        }
        // Locked shapes can be selected (so the inspector can offer Unlock) but
        // never enter a drag.
        if (hit.locked) {
          state.mode = "idle";
        } else {
          state.mode = "drag";
          snapshotSelection(ctx);
        }
      } else {
        if (!p.shift) ctx.setSelection([]);
        state.mode = "marquee";
        ctx.draftStore.setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
      }
    },
    onPointerMove(p, ctx) {
      if (state.mode === "drag") {
        applyDrag(p, ctx);
      } else if (state.mode === "marquee") {
        const x = Math.min(state.start.x, p.x);
        const y = Math.min(state.start.y, p.y);
        const w = Math.abs(p.x - state.start.x);
        const h = Math.abs(p.y - state.start.y);
        ctx.draftStore.setMarquee({ x, y, w, h });
      }
      state.last = { x: p.x, y: p.y };
    },
    onPointerUp(p, ctx) {
      if (state.mode === "marquee") {
        const marquee = {
          x: Math.min(state.start.x, p.x),
          y: Math.min(state.start.y, p.y),
          w: Math.abs(p.x - state.start.x),
          h: Math.abs(p.y - state.start.y),
        };
        ctx.draftStore.setMarquee(null);
        if (marquee.w > 2 && marquee.h > 2) {
          const hits = ctx
            .rectIntersect(marquee)
            .filter((s) => !s.locked && boundsIntersect(shapeBounds(s), marquee));
          const next = new Set(p.shift ? ctx.getSelection() : []);
          for (const s of hits) next.add(s.id);
          ctx.setSelection(next);
        }
      }
      state.mode = "idle";
      state.dragSnapshot.clear();
    },
    onCancel(ctx) {
      state.mode = "idle";
      state.dragSnapshot.clear();
      ctx.draftStore.setMarquee(null);
    },
    onKeyDown(e, ctx) {
      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = Array.from(ctx.getSelection()).filter(
          (id) => !ctx.store.getShape(ctx.pageId, id)?.locked,
        );
        if (ids.length === 0) return;
        e.preventDefault();
        ctx.store.transact(() => ctx.store.deleteShapes(ctx.pageId, ids));
        ctx.setSelection([]);
      } else if (e.key === "Escape") {
        ctx.setSelection([]);
        useTextEditStore.getState().end();
      }
    },
  };
}
