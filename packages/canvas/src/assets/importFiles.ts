import type { YAssetRef, YEmbed, YShape, AssetKind } from "@notux/types";
import { newShapeId } from "../ids";
import { useShapeStore } from "../store/shapeStore";
import { useToolStore } from "../store/toolStore";
import { useAssetStore } from "../store/assetStore";
import {
  primeBitmap,
  primeBlob,
  primePdfDoc,
  type AssetBitmap,
} from "./assetLoader";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches Supabase storage file_size_limit
const MAX_IMAGE_SIZE = 640; // world units, longest side of a placed image
const PDF_CELL_W = 360; // world units, grid cell width per page
const PDF_GRID_GAP = 24; // world units between cells / stacked imports
const PDF_GRID_COLS = 4;
const AUDIO_CARD_W = 320; // world units, default audio player card
const AUDIO_CARD_H = 96;

export interface ImportResult {
  created: string[];
  errors: { file: string; reason: string }[];
}

function classify(file: File): AssetKind | null {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

async function decodeImageFile(
  file: File,
): Promise<{ bitmap: AssetBitmap; w: number; h: number }> {
  // SVG: createImageBitmap is unreliable; measure via <img> (fall back to a
  // default box when the SVG declares no intrinsic size).
  if (file.type === "image/svg+xml" || typeof createImageBitmap !== "function") {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return {
        bitmap: img,
        w: img.naturalWidth || 320,
        h: img.naturalHeight || 320,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const bitmap = await createImageBitmap(file);
  return { bitmap, w: bitmap.width, h: bitmap.height };
}

function fitImage(w: number, h: number): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= MAX_IMAGE_SIZE || longest === 0) return { w, h };
  const s = MAX_IMAGE_SIZE / longest;
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

function makeShape(
  authorId: string,
  assetId: string,
  pageIndex: number | null,
  x: number,
  y: number,
  w: number,
  h: number,
): YAssetRef {
  return {
    id: newShapeId(),
    author: authorId,
    kind: "asset",
    assetId,
    pageIndex,
    x,
    y,
    w,
    h,
    rot: 0,
  };
}

function makeAudioEmbed(
  authorId: string,
  assetId: string,
  title: string,
  x: number,
  y: number,
): YEmbed {
  return {
    id: newShapeId(),
    author: authorId,
    kind: "embed",
    embedType: "audio",
    assetId,
    title,
    x,
    y,
    w: AUDIO_CARD_W,
    h: AUDIO_CARD_H,
    rot: 0,
  };
}

// Import images and PDFs at `world` (a drop point, or the viewport centre for
// the toolbar button). Images become one shape; a PDF becomes one shape per
// page laid out in a grid. All shapes are committed in a single transaction so
// one undo reverts the whole import.
export async function importFiles(
  files: FileList | File[],
  world: { x: number; y: number },
  pageId: string,
  authorId: string,
): Promise<ImportResult> {
  const list = Array.from(files);
  const assetStore = useAssetStore.getState();
  const errors: ImportResult["errors"] = [];
  const shapes: YShape[] = [];
  let originY = world.y; // advances so multiple files don't stack exactly

  for (const file of list) {
    const kind = classify(file);
    if (!kind) {
      errors.push({ file: file.name, reason: "Unsupported file type" });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push({ file: file.name, reason: "File exceeds 25 MB limit" });
      continue;
    }
    try {
      if (kind === "audio") {
        // No decoding: upload bytes and place a player card. The HTML overlay
        // resolves the public URL from the assetId at render time.
        const asset = await assetStore.ingest(file, {
          kind: "audio",
          pageCount: null,
        });
        shapes.push(
          makeAudioEmbed(
            authorId,
            asset.id,
            file.name,
            world.x - AUDIO_CARD_W / 2,
            originY - AUDIO_CARD_H / 2,
          ),
        );
        originY += AUDIO_CARD_H + PDF_GRID_GAP;
      } else if (kind === "image") {
        const dec = await decodeImageFile(file);
        const asset = await assetStore.ingest(file, {
          kind: "image",
          pageCount: null,
        });
        primeBlob(asset.id, file);
        primeBitmap(asset.id, null, dec.bitmap);
        const { w, h } = fitImage(dec.w, dec.h);
        shapes.push(
          makeShape(authorId, asset.id, null, world.x - w / 2, originY - h / 2, w, h),
        );
        originY += h + PDF_GRID_GAP;
      } else {
        const { loadPdf, pdfInfo } = await import("./pdf");
        const buf = await file.arrayBuffer();
        const doc = await loadPdf(buf);
        const info = await pdfInfo(doc);
        if (info.pageCount < 1) throw new Error("PDF has no pages");
        const asset = await assetStore.ingest(file, {
          kind: "pdf",
          pageCount: info.pageCount,
        });
        primeBlob(asset.id, file);
        primePdfDoc(asset.id, doc); // reuse the parsed doc for rasterization

        const cols = Math.min(info.pageCount, PDF_GRID_COLS);
        const cellH = PDF_CELL_W * (info.firstPage.h / info.firstPage.w);
        const rows = Math.ceil(info.pageCount / cols);
        const gridW = cols * PDF_CELL_W + (cols - 1) * PDF_GRID_GAP;
        const gridH = rows * cellH + (rows - 1) * PDF_GRID_GAP;
        const ox = world.x - gridW / 2;
        const oy = originY;
        for (let i = 0; i < info.pageCount; i++) {
          const c = i % cols;
          const r = Math.floor(i / cols);
          shapes.push(
            makeShape(
              authorId,
              asset.id,
              i,
              ox + c * (PDF_CELL_W + PDF_GRID_GAP),
              oy + r * (cellH + PDF_GRID_GAP),
              PDF_CELL_W,
              cellH,
            ),
          );
        }
        originY = oy + gridH + PDF_GRID_GAP;
      }
    } catch (err) {
      errors.push({
        file: file.name,
        reason: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  if (shapes.length > 0) {
    const store = useShapeStore.getState();
    store.transact(() => {
      for (const shape of shapes) store.addShape(pageId, shape);
    });
    useToolStore.getState().setSelection(shapes.map((s) => s.id));
  }

  return { created: shapes.map((s) => s.id), errors };
}
