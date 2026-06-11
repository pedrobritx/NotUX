import { useMemo } from "react";
import { Circle, Layer, Line, Rect } from "react-konva";
import { useSettingsStore } from "../store/settingsStore";
import { effectiveBackground, gridColorFor } from "../theme/backgroundPresets";
import type { ViewportState } from "../viewport/Viewport";

interface Props {
  viewport: ViewportState;
  width: number;
  height: number;
  theme: "light" | "dark";
}

const GRID_SPACING = 32;

interface WorldRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function visibleWorldRect(viewport: ViewportState, width: number, height: number): WorldRect {
  const left = -viewport.x / viewport.scale;
  const top = -viewport.y / viewport.scale;
  return {
    left,
    top,
    right: left + width / viewport.scale,
    bottom: top + height / viewport.scale,
  };
}

// Board paper: a solid background rect (synced board setting) plus a grid in
// the chosen style, drawn in world coordinates. The grid hides when zoomed out
// too far to keep the Konva node count bounded.
export function BackgroundLayer({ viewport, width, height, theme }: Props) {
  const background = useSettingsStore((s) => s.background);
  const grid = useSettingsStore((s) => s.grid);

  const bg = effectiveBackground(background, theme);
  const gridColor = gridColorFor(bg);
  const world = visibleWorldRect(viewport, width, height);
  const gridVisible = viewport.scale >= 0.35 && grid !== "plain";

  const dots = useMemo(() => {
    if (!gridVisible || grid !== "dots") return [];
    const startX = Math.floor(world.left / GRID_SPACING) * GRID_SPACING;
    const startY = Math.floor(world.top / GRID_SPACING) * GRID_SPACING;
    const out: Array<{ x: number; y: number }> = [];
    // Hard cap on dot count so the renderer is bounded even at low zooms.
    let count = 0;
    for (let y = startY; y <= world.bottom; y += GRID_SPACING) {
      for (let x = startX; x <= world.right; x += GRID_SPACING) {
        out.push({ x, y });
        count += 1;
        if (count > 8000) return out;
      }
    }
    return out;
  }, [gridVisible, grid, world.left, world.top, world.right, world.bottom]);

  // Line grids cost one node per row/column, so no cap is needed.
  const lines = useMemo(() => {
    if (!gridVisible || (grid !== "lines" && grid !== "ruled")) return [];
    const out: Array<{ points: number[] }> = [];
    const startY = Math.floor(world.top / GRID_SPACING) * GRID_SPACING;
    for (let y = startY; y <= world.bottom; y += GRID_SPACING) {
      out.push({ points: [world.left, y, world.right, y] });
    }
    if (grid === "lines") {
      const startX = Math.floor(world.left / GRID_SPACING) * GRID_SPACING;
      for (let x = startX; x <= world.right; x += GRID_SPACING) {
        out.push({ points: [x, world.top, x, world.bottom] });
      }
    }
    return out;
  }, [gridVisible, grid, world.left, world.top, world.right, world.bottom]);

  return (
    <Layer listening={false}>
      <Rect
        x={world.left}
        y={world.top}
        width={world.right - world.left}
        height={world.bottom - world.top}
        fill={bg}
      />
      {dots.map((d, i) => (
        <Circle
          key={i}
          x={d.x}
          y={d.y}
          radius={1 / viewport.scale}
          fill={gridColor}
        />
      ))}
      {lines.map((l, i) => (
        <Line
          key={i}
          points={l.points}
          stroke={gridColor}
          strokeWidth={1 / viewport.scale}
        />
      ))}
    </Layer>
  );
}
