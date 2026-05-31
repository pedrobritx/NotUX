import type { CSSProperties } from "react";
import type { YEmbed, YShape } from "@notux/types";
import { assetPublicUrl } from "./assets/storage";
import { useAssetStore } from "./store/assetStore";
import type { ViewportState } from "./viewport/Viewport";

interface Props {
  shapes: YShape[];
  selection: Set<string>;
  viewport: ViewportState;
}

// HTML players floated over the Konva stage, one per `embed` shape. Konva's
// <canvas> can't host <audio>/<iframe>, so each player is an absolutely
// positioned DOM node tracking the shape through the viewport transform (same
// world→screen math as TextEditorOverlay).
//
// Pointer rule: the player is click-through (pointer-events:none) unless its
// card is selected. So a single click selects/drags the card via Konva, and a
// second click (now selected) reaches the controls. This keeps SelectTool and
// the Transformer working unchanged.
export function MediaOverlayLayer({ shapes, selection, viewport }: Props) {
  const embeds = shapes.filter((s): s is YEmbed => s.kind === "embed");
  if (embeds.length === 0) return null;

  return (
    <>
      {embeds.map((shape) => (
        <EmbedPlayer
          key={shape.id}
          shape={shape}
          selected={selection.has(shape.id)}
          viewport={viewport}
        />
      ))}
    </>
  );
}

function EmbedPlayer({
  shape,
  selected,
  viewport,
}: {
  shape: YEmbed;
  selected: boolean;
  viewport: ViewportState;
}) {
  const left = shape.x * viewport.scale + viewport.x;
  const top = shape.y * viewport.scale + viewport.y;
  const width = shape.w * viewport.scale;
  const height = shape.h * viewport.scale;

  const wrap: CSSProperties = {
    position: "absolute",
    left,
    top,
    width,
    height,
    transform: shape.rot ? `rotate(${shape.rot}deg)` : undefined,
    transformOrigin: "top left",
    // Click-through until selected, so Konva drives select/drag first.
    pointerEvents: selected ? "auto" : "none",
    overflow: "hidden",
    borderRadius: 10,
    // Leave room so the EmbedRenderer card header (provider/title) stays visible
    // for audio; the player sits in the lower portion of the card.
    display: "flex",
    alignItems: "flex-end",
    boxSizing: "border-box",
    zIndex: 5,
  };

  if (shape.embedType === "audio") {
    const src = resolveAudioSrc(shape.assetId);
    return (
      <div style={wrap}>
        {src ? (
          <audio
            controls
            src={src}
            style={{ width: "100%", display: "block" }}
          />
        ) : null}
      </div>
    );
  }

  // youtube / gdrive — iframe embed.
  return (
    <div style={{ ...wrap, alignItems: "stretch" }}>
      {shape.url ? (
        <iframe
          src={shape.url}
          title={shape.title}
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : null}
    </div>
  );
}

function resolveAudioSrc(assetId: string | undefined): string | null {
  if (!assetId) return null;
  const { _client, _boardId } = useAssetStore.getState();
  if (!_client || !_boardId) return null;
  return assetPublicUrl(_client, _boardId, assetId);
}
