import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
// Vite emits a hashed URL for the worker bundle; this is the CSP-friendly way to
// wire the pdf.js worker (no CDN, no cross-origin worker). This module is only
// ever reached via dynamic import(), so pdf.js stays out of the initial bundle.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Clamp the longest rasterized side so large pages don't blow up memory.
const MAX_RASTER_PX = 2048;

export async function loadPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjs.getDocument({ data }).promise;
}

export async function pdfInfo(
  doc: PDFDocumentProxy,
): Promise<{ pageCount: number; firstPage: { w: number; h: number } }> {
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  return { pageCount: doc.numPages, firstPage: { w: vp.width, h: vp.height } };
}

// Rasterize a single page (0-based) to a canvas sized for `targetWidthPx` CSS
// pixels at the current device pixel ratio, clamped to MAX_RASTER_PX.
export async function rasterizePage(
  doc: PDFDocumentProxy,
  pageIndex: number,
  targetWidthPx: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageIndex + 1); // pdf.js pages are 1-based
  const base = page.getViewport({ scale: 1 });
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  let scale = (Math.max(1, targetWidthPx) * dpr) / base.width;
  const longest = Math.max(base.width, base.height) * scale;
  if (longest > MAX_RASTER_PX) scale *= MAX_RASTER_PX / longest;

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}
