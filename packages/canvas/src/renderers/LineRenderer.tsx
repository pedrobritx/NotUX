import type { YLine } from "@notux/types";
import { Line } from "react-konva";
import { resolveInkColor } from "../theme/adaptiveInk";

interface Props {
  shape: YLine;
  selected?: boolean;
  darkCanvas?: boolean;
}

export function LineRenderer({ shape, selected, darkCanvas = false }: Props) {
  return (
    <Line
      points={[shape.x1, shape.y1, shape.x2, shape.y2]}
      stroke={resolveInkColor(shape.stroke, darkCanvas)}
      strokeWidth={shape.width}
      lineCap="round"
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
      hitStrokeWidth={Math.max(shape.width, 12)}
    />
  );
}
