import type { YShape } from "@notux/types";
import type { Bounds } from "./shapeOps";
import { shapeBounds } from "./shapeOps";

// Freeform/Figma-style magnetic alignment: while dragging, the moved bounds'
// edges and centers snap to the edges/centers of every other shape on the
// page, and the matched alignment is drawn as a guide line spanning both
// shapes. Tolerance is given in world units (callers divide a screen-pixel
// budget by the viewport scale so the feel is zoom-independent).

export interface SnapGuide {
  orientation: "v" | "h";
  // World coordinate of the alignment line (x for vertical, y for horizontal).
  at: number;
  // Extent of the line along the other axis, spanning snapped + target shape.
  from: number;
  to: number;
}

interface SnapLine {
  at: number;
  // The target shape's extent perpendicular to the line, so guides can span
  // from the target to the moving selection.
  lo: number;
  hi: number;
}

export interface SnapTargets {
  v: SnapLine[]; // vertical lines (x positions): left / centerX / right
  h: SnapLine[]; // horizontal lines (y positions): top / centerY / bottom
}

export function collectSnapTargets(
  shapes: YShape[],
  exclude: ReadonlySet<string>,
): SnapTargets {
  const v: SnapLine[] = [];
  const h: SnapLine[] = [];
  for (const s of shapes) {
    if (exclude.has(s.id)) continue;
    const b = shapeBounds(s);
    if (b.w <= 0 && b.h <= 0) continue;
    const x2 = b.x + b.w;
    const y2 = b.y + b.h;
    v.push(
      { at: b.x, lo: b.y, hi: y2 },
      { at: b.x + b.w / 2, lo: b.y, hi: y2 },
      { at: x2, lo: b.y, hi: y2 },
    );
    h.push(
      { at: b.y, lo: b.x, hi: x2 },
      { at: b.y + b.h / 2, lo: b.x, hi: x2 },
      { at: y2, lo: b.x, hi: x2 },
    );
  }
  return { v, h };
}

interface AxisSnap {
  delta: number;
  line: SnapLine;
  // Which of the moving bounds' lines matched (its perpendicular extent is
  // merged with the target's for the guide length).
  atMoving: number;
}

function snapAxis(
  candidates: number[],
  lines: SnapLine[],
  tolerance: number,
): AxisSnap | null {
  let best: AxisSnap | null = null;
  for (const c of candidates) {
    for (const line of lines) {
      const delta = line.at - c;
      if (Math.abs(delta) > tolerance) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, line, atMoving: c };
      }
    }
  }
  return best;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

const NO_SNAP: SnapResult = { dx: 0, dy: 0, guides: [] };

/** Snap a moving bounds box against the targets. Returns the extra translation
 *  to apply on top of the gesture delta, plus the guides to draw. */
export function snapMovedBounds(
  moved: Bounds,
  targets: SnapTargets,
  tolerance: number,
): SnapResult {
  if (tolerance <= 0) return NO_SNAP;
  const xs = [moved.x, moved.x + moved.w / 2, moved.x + moved.w];
  const ys = [moved.y, moved.y + moved.h / 2, moved.y + moved.h];
  const sx = snapAxis(xs, targets.v, tolerance);
  const sy = snapAxis(ys, targets.h, tolerance);
  const guides: SnapGuide[] = [];
  if (sx) {
    guides.push({
      orientation: "v",
      at: sx.line.at,
      from: Math.min(sx.line.lo, moved.y + (sy?.delta ?? 0)),
      to: Math.max(sx.line.hi, moved.y + moved.h + (sy?.delta ?? 0)),
    });
  }
  if (sy) {
    guides.push({
      orientation: "h",
      at: sy.line.at,
      from: Math.min(sy.line.lo, moved.x + (sx?.delta ?? 0)),
      to: Math.max(sy.line.hi, moved.x + moved.w + (sx?.delta ?? 0)),
    });
  }
  return { dx: sx?.delta ?? 0, dy: sy?.delta ?? 0, guides };
}

/** Snap a single point (line/arrow endpoint) against the targets. */
export function snapPoint(
  p: { x: number; y: number },
  targets: SnapTargets,
  tolerance: number,
): SnapResult {
  if (tolerance <= 0) return NO_SNAP;
  const sx = snapAxis([p.x], targets.v, tolerance);
  const sy = snapAxis([p.y], targets.h, tolerance);
  const guides: SnapGuide[] = [];
  if (sx) {
    guides.push({
      orientation: "v",
      at: sx.line.at,
      from: Math.min(sx.line.lo, p.y + (sy?.delta ?? 0)),
      to: Math.max(sx.line.hi, p.y + (sy?.delta ?? 0)),
    });
  }
  if (sy) {
    guides.push({
      orientation: "h",
      at: sy.line.at,
      from: Math.min(sy.line.lo, p.x + (sx?.delta ?? 0)),
      to: Math.max(sy.line.hi, p.x + (sx?.delta ?? 0)),
    });
  }
  return { dx: sx?.delta ?? 0, dy: sy?.delta ?? 0, guides };
}
