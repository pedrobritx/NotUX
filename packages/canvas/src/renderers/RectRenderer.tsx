import type { YRect } from "@notux/types";
import { Rect } from "react-konva";
import { resolveInkColor } from "../theme/adaptiveInk";

interface Props {
  shape: YRect;
  selected?: boolean;
  darkCanvas?: boolean;
}

export function RectRenderer({ shape, selected, darkCanvas = false }: Props) {
  // Drawn in local coords; the ShapesLayer Group carries x/y/rotation so the
  // Konva Transformer can resize/rotate around the shape's own origin.
  // The outline is "ink" and adapts to the paper; a deliberate fill does not.
  return (
    <Rect
      x={0}
      y={0}
      width={shape.w}
      height={shape.h}
      cornerRadius={shape.radius ?? 0}
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
