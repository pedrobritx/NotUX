import type { YRect } from "@notux/types";
import { Rect } from "react-konva";

interface Props {
  shape: YRect;
  selected?: boolean;
}

export function RectRenderer({ shape, selected }: Props) {
  // Drawn in local coords; the ShapesLayer Group carries x/y/rotation so the
  // Konva Transformer can resize/rotate around the shape's own origin.
  return (
    <Rect
      x={0}
      y={0}
      width={shape.w}
      height={shape.h}
      cornerRadius={shape.radius ?? 0}
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
