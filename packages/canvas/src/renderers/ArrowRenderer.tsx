import type { YArrow } from "@notux/types";
import { Arrow } from "react-konva";

interface Props {
  shape: YArrow;
  selected?: boolean;
}

// Resolve the polyline the arrow follows for each routing variant. Konva draws
// the arrowhead at the final point; `tension` smooths the curved variant.
export function arrowPoints(shape: YArrow): { points: number[]; tension: number } {
  const { x1, y1, x2, y2, variant } = shape;
  if (variant === "elbow") {
    // Horizontal-then-vertical right-angle route.
    return { points: [x1, y1, x2, y1, x2, y2], tension: 0 };
  }
  if (variant === "curved") {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const off = Math.min(len * 0.25, 120);
    // Bow the midpoint out along the line's perpendicular.
    const mx = (x1 + x2) / 2 + (-dy / len) * off;
    const my = (y1 + y2) / 2 + (dx / len) * off;
    return { points: [x1, y1, mx, my, x2, y2], tension: 0.5 };
  }
  return { points: [x1, y1, x2, y2], tension: 0 };
}

export function ArrowRenderer({ shape, selected }: Props) {
  const { points, tension } = arrowPoints(shape);
  return (
    <Arrow
      points={points}
      tension={tension}
      stroke={shape.stroke}
      fill={shape.stroke}
      strokeWidth={shape.width}
      pointerLength={Math.max(8, shape.width * 3)}
      pointerWidth={Math.max(8, shape.width * 3)}
      lineCap="round"
      lineJoin="round"
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
      hitStrokeWidth={Math.max(shape.width, 12)}
    />
  );
}
