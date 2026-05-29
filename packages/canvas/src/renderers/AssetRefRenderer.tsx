import type { YAssetRef } from "@notux/types";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import { useAssetBitmap } from "../hooks/useAssetBitmap";

interface Props {
  shape: YAssetRef;
  selected?: boolean;
}

// M6 (PDF/image import) renderer. Loads the asset bitmap from Supabase Storage
// (via the asset loader cache) and paints it with a Konva Image. Drawn in local
// coords — the ShapesLayer Group carries x/y/rotation, so M5 transform/rotate/
// z-order/lock/opacity all apply unchanged.
export function AssetRefRenderer({ shape, selected }: Props) {
  const state = useAssetBitmap(shape.assetId, shape.pageIndex);
  const sel: {
    shadowColor?: string;
    shadowBlur?: number;
    shadowOpacity?: number;
  } = selected
    ? { shadowColor: "#5ac8fa", shadowBlur: 12, shadowOpacity: 0.9 }
    : {};

  if (state.status === "ready") {
    return (
      <Group listening>
        <KonvaImage
          image={state.bitmap}
          width={shape.w}
          height={shape.h}
          {...sel}
          listening
        />
      </Group>
    );
  }

  // Loading / error fall back to the dashed placeholder look.
  return (
    <Group listening>
      <Rect
        width={shape.w}
        height={shape.h}
        stroke={state.status === "error" ? "#ff6b6b" : "#5ac8fa"}
        dash={[8, 6]}
        fill="rgba(90, 200, 250, 0.06)"
        {...sel}
      />
      <Text
        x={12}
        y={12}
        text={state.status === "error" ? "Failed to load asset" : "Loading…"}
        fontFamily="-apple-system, system-ui, sans-serif"
        fontSize={13}
        fill="rgba(255,255,255,0.65)"
      />
    </Group>
  );
}
