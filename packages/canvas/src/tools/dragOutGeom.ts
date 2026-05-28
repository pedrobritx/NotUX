// Shared geometry helpers for tools that drag out a rect (RectTool, EllipseTool)
// or a line (LineTool, ArrowTool), with optional shift-constraint.

export function dragRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  shiftConstrain: boolean,
): { x: number; y: number; w: number; h: number } {
  let w = end.x - start.x;
  let h = end.y - start.y;
  if (shiftConstrain) {
    const m = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * m;
    h = Math.sign(h || 1) * m;
  }
  const x = w >= 0 ? start.x : start.x + w;
  const y = h >= 0 ? start.y : start.y + h;
  return { x, y, w: Math.abs(w), h: Math.abs(h) };
}

export function dragLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
  shiftConstrain: boolean,
): { x1: number; y1: number; x2: number; y2: number } {
  if (!shiftConstrain) return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  // Snap to 45° increments.
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 4;
  const snapped = Math.round(angle / step) * step;
  const dist = Math.hypot(dx, dy);
  return {
    x1: start.x,
    y1: start.y,
    x2: start.x + Math.cos(snapped) * dist,
    y2: start.y + Math.sin(snapped) * dist,
  };
}
