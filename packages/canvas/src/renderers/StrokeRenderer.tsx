import type { YStroke } from "@notux/types";
import { Line } from "react-konva";
import { strokeOutline } from "./strokeGeometry";
import { cssVar } from "../theme/cssVar";

interface Props {
  shape: YStroke;
  selected?: boolean;
}

// Opacity is applied one level up on the wrapping <Group> (ShapesLayer), so it
// is NOT set here to avoid double-application. This renderer only varies the
// style-specific paint (highlighters multiply so overlaps deepen).
export function StrokeRenderer({ shape, selected }: Props) {
  const flat = strokeOutline(shape.points, shape.pressure, {
    size: shape.size,
  });
  const isHighlighter =
    shape.tool === "highlighter" || shape.style === "highlighter";
  return (
    <Line
      points={flat}
      closed
      fill={shape.color}
      lineCap="round"
      lineJoin="round"
      globalCompositeOperation={isHighlighter ? "multiply" : undefined}
      shadowColor={selected ? cssVar("--selection", "#5ac8fa") : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
