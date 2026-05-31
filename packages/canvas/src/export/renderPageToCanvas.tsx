import type Konva from "konva";
import type { YShape } from "@notux/types";
import { createRoot } from "react-dom/client";
import { Stage } from "react-konva";
import { ShapesLayer } from "../layers/ShapesLayer";
import { shapeBounds, type Bounds } from "../tools/shapeOps";
import { loadAssetBitmap } from "../assets/assetLoader";

const PADDING = 24; // world units of breathing room around the content
const EXPORT_PIXEL_RATIO = 2; // raster DPI multiplier for crisp output
const MAX_DIM = 6000; // clamp the longest raster side so huge pages don't OOM
const ASSET_READY_TIMEOUT_MS = 3000; // give up waiting for assets after this

const EMPTY_SELECTION: Set<string> = new Set();

// Union of every shape's bounds plus padding. Null for an empty page.
export function contentBounds(shapes: YShape[]): Bounds | null {
  if (shapes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of shapes) {
    const b = shapeBounds(s);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: maxX - minX + PADDING * 2,
    h: maxY - minY + PADDING * 2,
  };
}

export interface PageRaster {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  aspect: number; // content width / height
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// AssetRefRenderer paints a Konva.Image once its bitmap resolves (and a dashed
// placeholder until then). With every asset bitmap pre-warmed into the loader
// cache, readiness is just: one Konva Image present per asset shape. Poll the
// detached stage until that holds, with a hard timeout so a missing/failed
// asset can't hang the export (we then capture whatever rendered).
async function waitForAssetsReady(
  stage: Konva.Stage,
  assetCount: number,
): Promise<void> {
  if (assetCount === 0) return;
  const deadline = Date.now() + ASSET_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (stage.find("Image").length >= assetCount) break;
    await nextFrame();
  }
  stage.batchDraw();
}

// Rasterize one page's shapes to a PNG data URL, cropped to the content
// bounding box. Reuses ShapesLayer (and thus every existing renderer) by
// mounting a detached react-konva Stage off-DOM — guaranteeing pixel parity
// with the live canvas. Returns null for an empty page.
export async function renderPageToCanvas(
  shapes: YShape[],
): Promise<PageRaster | null> {
  const bounds = contentBounds(shapes);
  if (!bounds) return null;

  // 1. Pre-warm every asset bitmap so the renderer hits the loader cache.
  const assetShapes = shapes.filter((s) => s.kind === "asset");
  await Promise.all(
    assetShapes.map((s) =>
      s.kind === "asset"
        ? loadAssetBitmap(s.assetId, s.pageIndex).catch(() => undefined)
        : undefined,
    ),
  );

  // 2. Size the raster to content * ratio, clamped to MAX_DIM.
  const ratio = Math.min(EXPORT_PIXEL_RATIO, MAX_DIM / Math.max(bounds.w, bounds.h));
  const widthPx = Math.max(1, Math.ceil(bounds.w * ratio));
  const heightPx = Math.max(1, Math.ceil(bounds.h * ratio));

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none;";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    let stage: Konva.Stage | null = null;
    await new Promise<void>((resolve) => {
      root.render(
        <Stage
          width={widthPx}
          height={heightPx}
          scaleX={ratio}
          scaleY={ratio}
          // Translate so the content's top-left lands at the raster origin.
          x={-bounds.x * ratio}
          y={-bounds.y * ratio}
          ref={(s: Konva.Stage | null) => {
            stage = s;
          }}
        >
          <ShapesLayer shapes={shapes} selection={EMPTY_SELECTION} />
        </Stage>,
      );
      // Let react-konva commit and the asset effects fire before we measure.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    if (!stage) return null;
    const konvaStage = stage as Konva.Stage;
    await waitForAssetsReady(konvaStage, assetShapes.length);

    const dataUrl = konvaStage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
    return { dataUrl, widthPx, heightPx, aspect: bounds.w / bounds.h };
  } finally {
    root.unmount();
    host.remove();
  }
}
