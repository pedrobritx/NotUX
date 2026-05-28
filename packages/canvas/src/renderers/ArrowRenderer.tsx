import type { YArrow } from "@notux/types";
import { Arrow } from "react-konva";

interface Props {
  shape: YArrow;
  selected?: boolean;
}

export function ArrowRenderer({ shape, selected }: Props) {
  return (
    <Arrow
      points={[shape.x1, shape.y1, shape.x2, shape.y2]}
      stroke={shape.stroke}
      fill={shape.stroke}
      strokeWidth={shape.width}
      pointerLength={Math.max(8, shape.width * 3)}
      pointerWidth={Math.max(8, shape.width * 3)}
      lineCap="round"
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
      hitStrokeWidth={Math.max(shape.width, 12)}
    />
  );
}
