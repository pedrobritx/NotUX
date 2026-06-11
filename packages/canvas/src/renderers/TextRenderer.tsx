import type { YText } from "@notux/types";
import { Text } from "react-konva";
import { resolveInkColor } from "../theme/adaptiveInk";

interface Props {
  shape: YText;
  selected?: boolean;
  darkCanvas?: boolean;
}

// Build Konva fontStyle from bold/italic flags.
function fontStyle(shape: YText): string | undefined {
  const parts: string[] = [];
  if (shape.bold) parts.push("bold");
  if (shape.italic) parts.push("italic");
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function TextRenderer({ shape, selected, darkCanvas = false }: Props) {
  // Local coords; the ShapesLayer Group carries x/y/rotation.
  return (
    <Text
      x={0}
      y={0}
      width={shape.w > 0 ? shape.w : undefined}
      text={shape.content}
      fontFamily={shape.font}
      fontSize={shape.size}
      fontStyle={fontStyle(shape)}
      textDecoration={shape.underline ? "underline" : undefined}
      align={shape.align ?? "left"}
      fill={resolveInkColor(shape.color, darkCanvas)}
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
