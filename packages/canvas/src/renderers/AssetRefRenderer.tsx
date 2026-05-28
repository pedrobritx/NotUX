import type { YAssetRef } from "@notux/types";
import { Group, Rect, Text } from "react-konva";

interface Props {
  shape: YAssetRef;
  selected?: boolean;
}

// Placeholder renderer for M2. M4–M5 (PDF/image import) replaces this with a
// real renderer that loads the asset from Supabase Storage.
export function AssetRefRenderer({ shape, selected }: Props) {
  return (
    <Group
      x={shape.x}
      y={shape.y}
      rotation={shape.rot}
      listening
    >
      <Rect
        width={shape.w}
        height={shape.h}
        stroke="#5ac8fa"
        dash={[8, 6]}
        fill="rgba(90, 200, 250, 0.06)"
        shadowColor={selected ? "#5ac8fa" : undefined}
        shadowBlur={selected ? 12 : 0}
        shadowOpacity={selected ? 0.9 : 0}
      />
      <Text
        x={12}
        y={12}
        text={`asset ${shape.assetId.slice(0, 6)}…`}
        fontFamily="-apple-system, system-ui, sans-serif"
        fontSize={13}
        fill="rgba(255,255,255,0.65)"
      />
    </Group>
  );
}
