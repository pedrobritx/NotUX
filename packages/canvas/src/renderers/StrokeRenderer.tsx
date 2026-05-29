import type { YStroke } from "@notux/types";
import { Line } from "react-konva";
import { strokeOutline } from "./strokeGeometry";

interface Props {
  shape: YStroke;
  selected?: boolean;
}

export function StrokeRenderer({ shape, selected }: Props) {
  const flat = strokeOutline(shape.points, shape.pressure, {
    size: shape.size,
  });
  return (
    <Line
      points={flat}
      closed
      fill={shape.color}
      lineCap="round"
      lineJoin="round"
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
