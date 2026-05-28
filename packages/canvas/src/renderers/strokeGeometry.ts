import { getStroke } from "perfect-freehand";

export interface FreehandOptions {
  size: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  simulatePressure?: boolean;
}

// Converts the flat YStroke.points + pressure arrays into perfect-freehand's
// expected [x, y, pressure][] form, runs getStroke, and flattens the polygon
// into Konva.Line's flat-points format.
export function strokeOutline(
  points: number[],
  pressure: number[],
  options: FreehandOptions,
): number[] {
  if (points.length < 2) return [];
  const tuples: [number, number, number][] = [];
  for (let i = 0, p = 0; i < points.length; i += 2, p += 1) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    const pr = pressure[p] ?? 0.5;
    tuples.push([x, y, pr]);
  }
  const outline = getStroke(tuples, {
    size: options.size,
    thinning: options.thinning ?? 0.55,
    smoothing: options.smoothing ?? 0.5,
    streamline: options.streamline ?? 0.5,
    simulatePressure: options.simulatePressure ?? false,
    last: true,
  });
  const flat: number[] = [];
  for (const pt of outline) {
    flat.push(pt[0] ?? 0, pt[1] ?? 0);
  }
  return flat;
}
