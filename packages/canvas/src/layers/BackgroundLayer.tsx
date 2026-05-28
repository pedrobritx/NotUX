import { useMemo } from "react";
import { Circle, Layer } from "react-konva";
import type { ViewportState } from "../viewport/Viewport";

interface Props {
  viewport: ViewportState;
  width: number;
  height: number;
}

const GRID_SPACING = 32;

// Light dot grid drawn in world coordinates. Hidden when zoomed out too far
// to keep the dot count and Konva node count bounded.
export function BackgroundLayer({ viewport, width, height }: Props) {
  const dots = useMemo(() => {
    if (viewport.scale < 0.35) return [];
    const left = -viewport.x / viewport.scale;
    const top = -viewport.y / viewport.scale;
    const right = left + width / viewport.scale;
    const bottom = top + height / viewport.scale;
    const startX = Math.floor(left / GRID_SPACING) * GRID_SPACING;
    const startY = Math.floor(top / GRID_SPACING) * GRID_SPACING;
    const out: Array<{ x: number; y: number }> = [];
    // Hard cap on dot count so the renderer is bounded even at low zooms.
    let count = 0;
    for (let y = startY; y <= bottom; y += GRID_SPACING) {
      for (let x = startX; x <= right; x += GRID_SPACING) {
        out.push({ x, y });
        count += 1;
        if (count > 8000) return out;
      }
    }
    return out;
  }, [viewport.x, viewport.y, viewport.scale, width, height]);

  return (
    <Layer listening={false}>
      {dots.map((d, i) => (
        <Circle
          key={i}
          x={d.x}
          y={d.y}
          radius={1 / viewport.scale}
          fill="rgba(255, 255, 255, 0.10)"
        />
      ))}
    </Layer>
  );
}
