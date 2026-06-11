import type { YSticky } from "@notux/types";
import { Rect, Text } from "react-konva";

interface Props {
  shape: YSticky;
  selected?: boolean;
}

const PAD = 14;

// Choose readable text ink for a given note color (dark text on light notes).
function inkFor(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m || !m[1]) return "#1c1c1e";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Perceived luminance.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1c1c1e" : "#ffffff";
}

export function StickyRenderer({ shape, selected }: Props) {
  // Local coords; the ShapesLayer Group carries x/y/rotation.
  return (
    <>
      <Rect
        x={0}
        y={0}
        width={shape.w}
        height={shape.h}
        cornerRadius={6}
        fill={shape.color}
        shadowColor={selected ? "#5ac8fa" : "rgba(0,0,0,0.25)"}
        shadowBlur={selected ? 14 : 8}
        shadowOffsetY={selected ? 0 : 4}
        shadowOpacity={selected ? 0.9 : 0.5}
        listening
      />
      <Text
        x={PAD}
        y={PAD}
        width={Math.max(0, shape.w - PAD * 2)}
        height={Math.max(0, shape.h - PAD * 2)}
        text={shape.content}
        fontFamily="-apple-system, system-ui, sans-serif"
        fontSize={shape.fontSize ?? 18}
        lineHeight={1.3}
        fill={inkFor(shape.color)}
        align={shape.align ?? "center"}
        verticalAlign="middle"
        wrap="word"
        listening={false}
      />
    </>
  );
}
