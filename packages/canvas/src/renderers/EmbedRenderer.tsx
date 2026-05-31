import type { YEmbed } from "@notux/types";
import { Group, Rect, Text } from "react-konva";

interface Props {
  shape: YEmbed;
  selected?: boolean;
}

const LABELS: Record<YEmbed["embedType"], string> = {
  audio: "♫  Audio",
  youtube: "▶  YouTube",
  gdrive: "▶  Google Drive",
};

// Konva "card" for an audio/video resource. It owns selection, drag, resize and
// z-order like any box shape; the live <audio>/<iframe> player is drawn on top
// by MediaOverlayLayer (a DOM overlay), since Konva can't host those elements.
// The card stays visible behind/around the player as a frame and while the
// overlay loads. Drawn in local coords — the ShapesLayer Group carries
// x/y/rotation.
export function EmbedRenderer({ shape, selected }: Props) {
  const sel = selected
    ? { shadowColor: "#5ac8fa", shadowBlur: 12, shadowOpacity: 0.9 }
    : {};
  return (
    <Group listening>
      <Rect
        width={shape.w}
        height={shape.h}
        cornerRadius={10}
        fill="rgba(20, 22, 28, 0.92)"
        stroke={selected ? "#5ac8fa" : "rgba(255,255,255,0.18)"}
        strokeWidth={1}
        {...sel}
      />
      <Text
        x={12}
        y={10}
        width={shape.w - 24}
        text={LABELS[shape.embedType]}
        fontFamily="-apple-system, system-ui, sans-serif"
        fontStyle="600"
        fontSize={13}
        fill="rgba(255,255,255,0.85)"
        listening={false}
      />
      <Text
        x={12}
        y={30}
        width={shape.w - 24}
        height={shape.h - 36}
        text={shape.title}
        fontFamily="-apple-system, system-ui, sans-serif"
        fontSize={12}
        fill="rgba(255,255,255,0.5)"
        ellipsis
        wrap="none"
        listening={false}
      />
    </Group>
  );
}
