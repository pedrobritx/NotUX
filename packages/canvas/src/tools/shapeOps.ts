import type { YShape } from "@notux/types";

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function shapeBounds(shape: YShape): Bounds {
  switch (shape.kind) {
    case "stroke": {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < shape.points.length; i += 2) {
        const x = shape.points[i] ?? 0;
        const y = shape.points[i + 1] ?? 0;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
      const pad = shape.size;
      return {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
      };
    }
    case "rect":
    case "ellipse":
    case "text":
    case "asset":
      return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    case "line":
    case "arrow": {
      const x = Math.min(shape.x1, shape.x2);
      const y = Math.min(shape.y1, shape.y2);
      return {
        x,
        y,
        w: Math.abs(shape.x2 - shape.x1),
        h: Math.abs(shape.y2 - shape.y1),
      };
    }
  }
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export function translateShape(shape: YShape, dx: number, dy: number): YShape {
  switch (shape.kind) {
    case "stroke": {
      const points = shape.points.slice();
      for (let i = 0; i < points.length; i += 2) {
        points[i] = (points[i] ?? 0) + dx;
        points[i + 1] = (points[i + 1] ?? 0) + dy;
      }
      return { ...shape, points };
    }
    case "rect":
    case "ellipse":
    case "text":
    case "asset":
      return { ...shape, x: shape.x + dx, y: shape.y + dy };
    case "line":
    case "arrow":
      return {
        ...shape,
        x1: shape.x1 + dx,
        y1: shape.y1 + dy,
        x2: shape.x2 + dx,
        y2: shape.y2 + dy,
      };
  }
}
