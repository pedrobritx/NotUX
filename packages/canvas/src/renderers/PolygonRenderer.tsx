import type { YPolygon } from "@notux/types";
import { Line } from "react-konva";

interface Props {
  shape: YPolygon;
  selected?: boolean;
}

// Points of the polygon inscribed in the shape's local w×h box (the ShapesLayer
// Group carries x/y/rotation, so we draw from 0,0).
export function polygonPoints(variant: YPolygon["variant"], w: number, h: number): number[] {
  if (variant === "triangle") {
    return [w / 2, 0, w, h, 0, h];
  }
  // diamond
  return [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
}

export function PolygonRenderer({ shape, selected }: Props) {
  return (
    <Line
      points={polygonPoints(shape.variant, shape.w, shape.h)}
      closed
      stroke={shape.stroke}
      strokeWidth={2}
      lineJoin="round"
      fill={shape.fill ?? undefined}
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
