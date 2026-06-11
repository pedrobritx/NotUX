import type { YEllipse } from "@notux/types";
import { Ellipse } from "react-konva";
import { resolveInkColor } from "../theme/adaptiveInk";

interface Props {
  shape: YEllipse;
  selected?: boolean;
  darkCanvas?: boolean;
}

export function EllipseRenderer({ shape, selected, darkCanvas = false }: Props) {
  // Centered in local coords; the ShapesLayer Group (anchored at the shape's
  // top-left) carries x/y/rotation for the Konva Transformer.
  return (
    <Ellipse
      x={shape.w / 2}
      y={shape.h / 2}
      radiusX={Math.abs(shape.w) / 2}
      radiusY={Math.abs(shape.h) / 2}
      stroke={resolveInkColor(shape.stroke, darkCanvas)}
      strokeWidth={2}
      fill={shape.fill ?? undefined}
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
