export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;

export function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

export function screenToWorld(
  v: ViewportState,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return { x: (sx - v.x) / v.scale, y: (sy - v.y) / v.scale };
}

export function worldToScreen(
  v: ViewportState,
  wx: number,
  wy: number,
): { x: number; y: number } {
  return { x: wx * v.scale + v.x, y: wy * v.scale + v.y };
}

// Zoom anchored on (anchorSx, anchorSy) in screen space — the world point
// under the anchor stays under the anchor.
export function zoomAt(
  v: ViewportState,
  anchorSx: number,
  anchorSy: number,
  nextScale: number,
): ViewportState {
  const clamped = clampScale(nextScale);
  const world = screenToWorld(v, anchorSx, anchorSy);
  return {
    scale: clamped,
    x: anchorSx - world.x * clamped,
    y: anchorSy - world.y * clamped,
  };
}
