import type { YArrow, YLine, YShape } from "@notux/types";
import { useTextEditStore } from "../store/textEditStore";
import type { Bounds } from "./shapeOps";
import { boundsIntersect, shapeBounds, translateShape } from "./shapeOps";
import {
  collectSnapTargets,
  snapMovedBounds,
  snapPoint,
  type SnapTargets,
} from "./snapping";
import type { Tool, ToolContext, ToolEventPoint } from "./types";

type Mode = "idle" | "drag" | "marquee" | "endpoint";

// Screen-pixel budgets, divided by the viewport scale per gesture so feel is
// zoom-independent.
const SNAP_TOLERANCE_PX = 8;
const ENDPOINT_HIT_PX = 14;

interface State {
  mode: Mode;
  start: { x: number; y: number };
  last: { x: number; y: number };
  // Snapshot of shapes at drag start, so translation is from the original
  // position rather than compounding rounding error each pointermove.
  dragSnapshot: Map<string, YShape>;
  // Union bounds of the snapshot, for magnetic snapping.
  dragBounds: Bounds | null;
  // Alignment targets collected once per gesture (everything not being moved).
  snapTargets: SnapTargets | null;
  // Endpoint editing (line/arrow): which end is being dragged.
  endpointShape: YLine | YArrow | null;
  endpointIndex: 1 | 2;
}

function unionBounds(shapes: Iterable<YShape>): Bounds | null {
  let out: Bounds | null = null;
  for (const s of shapes) {
    const b = shapeBounds(s);
    if (!out) {
      out = { ...b };
    } else {
      const x = Math.min(out.x, b.x);
      const y = Math.min(out.y, b.y);
      out.w = Math.max(out.x + out.w, b.x + b.w) - x;
      out.h = Math.max(out.y + out.h, b.y + b.h) - y;
      out.x = x;
      out.y = y;
    }
  }
  return out;
}

// World-units-per-screen-pixel, derived from the world→container projection.
function worldPerPixel(ctx: ToolContext): number {
  const a = ctx.worldToContainer({ x: 0, y: 0 });
  const b = ctx.worldToContainer({ x: 1, y: 0 });
  const scale = Math.abs(b.x - a.x);
  return scale > 0 ? 1 / scale : 1;
}

export function makeSelectTool(): Tool {
  const state: State = {
    mode: "idle",
    start: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
    dragSnapshot: new Map(),
    dragBounds: null,
    snapTargets: null,
    endpointShape: null,
    endpointIndex: 1,
  };

  function snapshotSelection(ctx: ToolContext) {
    state.dragSnapshot.clear();
    for (const id of ctx.getSelection()) {
      const s = ctx.store.getShape(ctx.pageId, id);
      // Locked shapes are never dragged, even within a mixed selection.
      if (s && !s.locked) state.dragSnapshot.set(id, s);
    }
    state.dragBounds = unionBounds(state.dragSnapshot.values());
    state.snapTargets = collectSnapTargets(
      ctx.store.listShapes(ctx.pageId),
      new Set(state.dragSnapshot.keys()),
    );
  }

  function applyDrag(p: ToolEventPoint, ctx: ToolContext) {
    let dx = p.x - state.start.x;
    let dy = p.y - state.start.y;
    if (!p.alt && state.dragBounds && state.snapTargets) {
      const moved: Bounds = {
        x: state.dragBounds.x + dx,
        y: state.dragBounds.y + dy,
        w: state.dragBounds.w,
        h: state.dragBounds.h,
      };
      const tolerance = SNAP_TOLERANCE_PX * worldPerPixel(ctx);
      const snap = snapMovedBounds(moved, state.snapTargets, tolerance);
      dx += snap.dx;
      dy += snap.dy;
      ctx.draftStore.setGuides(snap.guides);
    } else {
      ctx.draftStore.setGuides([]);
    }
    ctx.store.transact(() => {
      for (const [id, original] of state.dragSnapshot) {
        const moved = translateShape(original, dx, dy);
        ctx.store.updateShape(ctx.pageId, id, moved);
      }
    });
  }

  // The endpoint hit-test runs before the shape hit-test so the handles win
  // over the (thin) line body they sit on.
  function endpointAt(
    p: ToolEventPoint,
    ctx: ToolContext,
  ): { shape: YLine | YArrow; index: 1 | 2 } | null {
    const selection = ctx.getSelection();
    if (selection.size !== 1) return null;
    const id = selection.values().next().value as string;
    const s = ctx.store.getShape(ctx.pageId, id);
    if (!s || s.locked || (s.kind !== "line" && s.kind !== "arrow")) return null;
    const r = ENDPOINT_HIT_PX * worldPerPixel(ctx);
    const d1 = Math.hypot(p.x - s.x1, p.y - s.y1);
    const d2 = Math.hypot(p.x - s.x2, p.y - s.y2);
    if (d1 > r && d2 > r) return null;
    return { shape: s, index: d1 <= d2 ? 1 : 2 };
  }

  function applyEndpointDrag(p: ToolEventPoint, ctx: ToolContext) {
    const shape = state.endpointShape;
    if (!shape) return;
    const fixed =
      state.endpointIndex === 1
        ? { x: shape.x2, y: shape.y2 }
        : { x: shape.x1, y: shape.y1 };
    let nx = p.x;
    let ny = p.y;
    if (p.shift) {
      // Constrain to 45° steps around the fixed endpoint (Keynote-style).
      const angle = Math.atan2(ny - fixed.y, nx - fixed.x);
      const dist = Math.hypot(nx - fixed.x, ny - fixed.y);
      const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      nx = fixed.x + Math.cos(snapped) * dist;
      ny = fixed.y + Math.sin(snapped) * dist;
      ctx.draftStore.setGuides([]);
    } else if (!p.alt && state.snapTargets) {
      const tolerance = SNAP_TOLERANCE_PX * worldPerPixel(ctx);
      const snap = snapPoint({ x: nx, y: ny }, state.snapTargets, tolerance);
      nx += snap.dx;
      ny += snap.dy;
      ctx.draftStore.setGuides(snap.guides);
    } else {
      ctx.draftStore.setGuides([]);
    }
    const patch =
      state.endpointIndex === 1
        ? { x1: nx, y1: ny }
        : { x2: nx, y2: ny };
    ctx.store.updateShape(ctx.pageId, shape.id, patch);
  }

  function endGesture(ctx: ToolContext) {
    state.mode = "idle";
    state.dragSnapshot.clear();
    state.dragBounds = null;
    state.snapTargets = null;
    state.endpointShape = null;
    ctx.draftStore.setGuides([]);
  }

  return {
    cursor: "default",
    onPointerDown(p, ctx) {
      state.start = { x: p.x, y: p.y };
      state.last = { x: p.x, y: p.y };

      const endpoint = endpointAt(p, ctx);
      if (endpoint) {
        state.mode = "endpoint";
        state.endpointShape = endpoint.shape;
        state.endpointIndex = endpoint.index;
        state.snapTargets = collectSnapTargets(
          ctx.store.listShapes(ctx.pageId),
          new Set([endpoint.shape.id]),
        );
        return;
      }

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
      } else if (state.mode === "endpoint") {
        applyEndpointDrag(p, ctx);
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
      endGesture(ctx);
    },
    onCancel(ctx) {
      endGesture(ctx);
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
