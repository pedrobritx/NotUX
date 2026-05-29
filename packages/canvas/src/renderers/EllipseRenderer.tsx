import type { YEllipse } from "@notux/types";
import { Ellipse } from "react-konva";

interface Props {
  shape: YEllipse;
  selected?: boolean;
}

export function EllipseRenderer({ shape, selected }: Props) {
  // Centered in local coords; the ShapesLayer Group (anchored at the shape's
  // top-left) carries x/y/rotation for the Konva Transformer.
  return (
    <Ellipse
      x={shape.w / 2}
      y={shape.h / 2}
      radiusX={Math.abs(shape.w) / 2}
      radiusY={Math.abs(shape.h) / 2}
      stroke={shape.stroke}
      strokeWidth={2}
      fill={shape.fill ?? undefined}
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
