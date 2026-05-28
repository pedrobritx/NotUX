import type { YEllipse } from "@notux/types";
import { Ellipse } from "react-konva";

interface Props {
  shape: YEllipse;
  selected?: boolean;
}

export function EllipseRenderer({ shape, selected }: Props) {
  return (
    <Ellipse
      x={shape.x + shape.w / 2}
      y={shape.y + shape.h / 2}
      radiusX={Math.abs(shape.w) / 2}
      radiusY={Math.abs(shape.h) / 2}
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
