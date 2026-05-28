import type { YRect } from "@notux/types";
import { Rect } from "react-konva";

interface Props {
  shape: YRect;
  selected?: boolean;
}

export function RectRenderer({ shape, selected }: Props) {
  return (
    <Rect
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      rotation={shape.rot}
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
