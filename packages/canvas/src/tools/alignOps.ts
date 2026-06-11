import type { YShape } from "@notux/types";
import type { ShapeStore } from "../store/shapeStore";
import { shapeBounds, translateShape } from "./shapeOps";

// Keynote/Freeform-style alignment and distribution. Both operate purely via
// bounds + translation so they work for every shape kind, strokes included.

export type AlignEdge =
  | "left"
  | "hcenter"
  | "right"
  | "top"
  | "vcenter"
  | "bottom";

function liveShapes(
  store: ShapeStore,
  pageId: string,
  ids: Iterable<string>,
): YShape[] {
  const out: YShape[] = [];
  for (const id of ids) {
    const s = store.getShape(pageId, id);
    if (s && !s.locked) out.push(s);
  }
  return out;
}

export function alignShapes(
  store: ShapeStore,
  pageId: string,
  ids: Iterable<string>,
  edge: AlignEdge,
): void {
  const shapes = liveShapes(store, pageId, ids);
  if (shapes.length < 2) return;
  const boxes = shapes.map(shapeBounds);
  const minX = Math.min(...boxes.map((b) => b.x));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  store.transact(() => {
    shapes.forEach((s, i) => {
      const b = boxes[i]!;
      let dx = 0;
      let dy = 0;
      switch (edge) {
        case "left":
          dx = minX - b.x;
          break;
        case "hcenter":
          dx = (minX + maxX) / 2 - (b.x + b.w / 2);
          break;
        case "right":
          dx = maxX - (b.x + b.w);
          break;
        case "top":
          dy = minY - b.y;
          break;
        case "vcenter":
          dy = (minY + maxY) / 2 - (b.y + b.h / 2);
          break;
        case "bottom":
          dy = maxY - (b.y + b.h);
          break;
      }
      if (dx !== 0 || dy !== 0) {
        store.updateShape(pageId, s.id, translateShape(s, dx, dy));
      }
    });
  });
}

/** Even out the gaps between three or more shapes along an axis. */
export function distributeShapes(
  store: ShapeStore,
  pageId: string,
  ids: Iterable<string>,
  axis: "h" | "v",
): void {
  const shapes = liveShapes(store, pageId, ids);
  if (shapes.length < 3) return;
  const items = shapes
    .map((s) => ({ s, b: shapeBounds(s) }))
    .sort((a, z) =>
      axis === "h" ? a.b.x - z.b.x : a.b.y - z.b.y,
    );
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const span =
    axis === "h"
      ? last.b.x + last.b.w - first.b.x
      : last.b.y + last.b.h - first.b.y;
  const total = items.reduce(
    (acc, it) => acc + (axis === "h" ? it.b.w : it.b.h),
    0,
  );
  const gap = (span - total) / (items.length - 1);
  store.transact(() => {
    let cursor =
      (axis === "h" ? first.b.x + first.b.w : first.b.y + first.b.h) + gap;
    for (let i = 1; i < items.length - 1; i++) {
      const it = items[i]!;
      const delta = axis === "h" ? cursor - it.b.x : cursor - it.b.y;
      if (delta !== 0) {
        store.updateShape(
          pageId,
          it.s.id,
          translateShape(it.s, axis === "h" ? delta : 0, axis === "h" ? 0 : delta),
        );
      }
      cursor += (axis === "h" ? it.b.w : it.b.h) + gap;
    }
  });
}
