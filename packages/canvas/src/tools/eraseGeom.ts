import type { YStroke } from "@notux/types";
import { newShapeId } from "../ids";

export interface EraseResult {
  // True when at least one point fell inside the eraser radius.
  changed: boolean;
  // The surviving sub-strokes (empty when the whole stroke was erased).
  pieces: YStroke[];
}

// Point-based area erase: drops every point within `r` of (cx,cy) and splits the
// stroke into the contiguous runs that survive. Pen strokes are densely sampled,
// so a point test approximates trimming the line where the eraser passes. Each
// run of >= 2 points becomes a fresh stroke carrying the original's style.
export function splitStrokeByEraser(
  stroke: YStroke,
  cx: number,
  cy: number,
  r: number,
): EraseResult {
  const r2 = r * r;
  const runs: { points: number[]; pressure: number[] }[] = [];
  let cur: { points: number[]; pressure: number[] } | null = null;
  let changed = false;

  for (let i = 0; i < stroke.points.length; i += 2) {
    const x = stroke.points[i] ?? 0;
    const y = stroke.points[i + 1] ?? 0;
    const dx = x - cx;
    const dy = y - cy;
    const inside = dx * dx + dy * dy <= r2;
    if (inside) {
      changed = true;
      cur = null; // close the current run
      continue;
    }
    if (!cur) {
      cur = { points: [], pressure: [] };
      runs.push(cur);
    }
    cur.points.push(x, y);
    cur.pressure.push(stroke.pressure[i / 2] ?? 0.5);
  }

  if (!changed) return { changed: false, pieces: [stroke] };

  const pieces: YStroke[] = runs
    .filter((run) => run.points.length >= 4) // >= 2 points
    .map((run) => ({
      ...stroke,
      id: newShapeId(),
      points: run.points,
      pressure: run.pressure,
    }));

  return { changed: true, pieces };
}
