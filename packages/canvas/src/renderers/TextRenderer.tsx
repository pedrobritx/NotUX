import type { YText } from "@notux/types";
import { Text } from "react-konva";

interface Props {
  shape: YText;
  selected?: boolean;
}

export function TextRenderer({ shape, selected }: Props) {
  // Local coords; the ShapesLayer Group carries x/y/rotation.
  return (
    <Text
      x={0}
      y={0}
      width={shape.w > 0 ? shape.w : undefined}
      text={shape.content}
      fontFamily={shape.font}
      fontSize={shape.size}
      fill={shape.color}
      shadowColor={selected ? "#5ac8fa" : undefined}
      shadowBlur={selected ? 12 : 0}
      shadowOpacity={selected ? 0.9 : 0}
      listening
    />
  );
}
