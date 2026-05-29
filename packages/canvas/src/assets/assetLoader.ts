import type { PDFDocumentProxy } from "pdfjs-dist";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAssetStore } from "../store/assetStore";
import { downloadAssetBlob } from "./storage";

export type AssetBitmap = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

const BITMAP_CACHE_LIMIT = 40;
const BLOB_CACHE_LIMIT = 8;
const PDF_DOC_CACHE_LIMIT = 3;
// Target CSS-px width a rasterized PDF page is rendered at (scaled by DPR).
const PDF_RASTER_WIDTH = 1024;

const bitmapCache = new Map<string, AssetBitmap>();
const inflight = new Map<string, Promise<AssetBitmap>>();
const blobCache = new Map<string, Promise<Blob>>();
const pdfDocCache = new Map<string, Promise<PDFDocumentProxy>>();

function key(assetId: string, pageIndex: number | null): string {
  return `${assetId}:${pageIndex ?? "img"}`;
}

// Insertion-order Map doubles as an LRU: re-set on access, evict the oldest key
// once over the limit.
function lruSet<V>(map: Map<string, V>, k: string, v: V, limit: number): void {
  map.delete(k);
  map.set(k, v);
  if (map.size > limit) {
    const oldest = map.keys().next().value as string | undefined;
    if (oldest !== undefined) map.delete(oldest);
  }
}

function requireCtx(): { boardId: string; client: SupabaseClient } {
  const s = useAssetStore.getState();
  if (!s._boardId || !s._client) {
    throw new Error("Asset subsystem not configured with Supabase");
  }
  return { boardId: s._boardId, client: s._client };
}

function resolveBlob(assetId: string): Promise<Blob> {
  const existing = blobCache.get(assetId);
  if (existing) {
    lruSet(blobCache, assetId, existing, BLOB_CACHE_LIMIT);
    return existing;
  }
  const { boardId, client } = requireCtx();
  const p = downloadAssetBlob(client, boardId, assetId).catch((err) => {
    blobCache.delete(assetId); // allow retry on transient failure
    throw err;
  });
  lruSet(blobCache, assetId, p, BLOB_CACHE_LIMIT);
  return p;
}

function setPdfDoc(assetId: string, p: Promise<PDFDocumentProxy>): void {
  while (pdfDocCache.size >= PDF_DOC_CACHE_LIMIT) {
    const oldest = pdfDocCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    const dead = pdfDocCache.get(oldest);
    pdfDocCache.delete(oldest);
    void dead?.then((d) => d.destroy()).catch(() => {});
  }
  pdfDocCache.set(assetId, p);
}

function resolvePdfDoc(assetId: string): Promise<PDFDocumentProxy> {
  const existing = pdfDocCache.get(assetId);
  if (existing) return existing;
  const p = (async () => {
    const blob = await resolveBlob(assetId);
    const buf = await blob.arrayBuffer();
    const { loadPdf } = await import("./pdf");
    return loadPdf(buf);
  })().catch((err) => {
    pdfDocCache.delete(assetId);
    throw err;
  });
  setPdfDoc(assetId, p);
  return p;
}

async function decodeImage(blob: Blob): Promise<AssetBitmap> {
  // createImageBitmap on SVG is unreliable cross-browser; decode via <img>.
  if (blob.type === "image/svg+xml" || typeof createImageBitmap !== "function") {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return createImageBitmap(blob);
}

// Seed the cache with a bitmap decoded at import time so a freshly placed shape
// paints without a Storage round-trip.
export function primeBitmap(
  assetId: string,
  pageIndex: number | null,
  bmp: AssetBitmap,
): void {
  lruSet(bitmapCache, key(assetId, pageIndex), bmp, BITMAP_CACHE_LIMIT);
}

export function primeBlob(assetId: string, blob: Blob): void {
  lruSet(blobCache, assetId, Promise.resolve(blob), BLOB_CACHE_LIMIT);
}

export function primePdfDoc(assetId: string, doc: PDFDocumentProxy): void {
  setPdfDoc(assetId, Promise.resolve(doc));
}

export function loadAssetBitmap(
  assetId: string,
  pageIndex: number | null,
): Promise<AssetBitmap> {
  const k = key(assetId, pageIndex);
  const cached = bitmapCache.get(k);
  if (cached) {
    lruSet(bitmapCache, k, cached, BITMAP_CACHE_LIMIT);
    return Promise.resolve(cached);
  }
  const pending = inflight.get(k);
  if (pending) return pending;

  const p = (async (): Promise<AssetBitmap> => {
    let bmp: AssetBitmap;
    if (pageIndex === null) {
      bmp = await decodeImage(await resolveBlob(assetId));
    } else {
      const doc = await resolvePdfDoc(assetId);
      const { rasterizePage } = await import("./pdf");
      bmp = await rasterizePage(doc, pageIndex, PDF_RASTER_WIDTH);
    }
    lruSet(bitmapCache, k, bmp, BITMAP_CACHE_LIMIT);
    return bmp;
  })();

  inflight.set(k, p);
  void p.catch(() => undefined).then(() => inflight.delete(k));
  return p;
}

// Drop every cache (e.g. when leaving a board).
export function clearAssetCaches(): void {
  bitmapCache.clear();
  inflight.clear();
  blobCache.clear();
  for (const p of pdfDocCache.values()) {
    void p.then((d) => d.destroy()).catch(() => undefined);
  }
  pdfDocCache.clear();
}
