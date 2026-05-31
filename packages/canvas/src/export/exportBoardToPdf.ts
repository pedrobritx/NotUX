import { useShapeStore } from "../store/shapeStore";
import { renderPageToCanvas } from "./renderPageToCanvas";

export interface ExportPage {
  id: string;
  title: string;
}

export interface ExportOptions {
  // Ordered pages to export. The caller filters by scope (current/all).
  pages: ExportPage[];
  filename?: string;
}

// Baseline page width in points; each PDF page's height follows the page's
// content aspect ratio so nothing is stretched.
const PAGE_WIDTH_PT = 612; // US-Letter width
const FALLBACK_FORMAT: [number, number] = [612, 792]; // Letter portrait

// Render each board page to a content-cropped raster and assemble a multi-page
// PDF (one PDF page per non-empty board page). Empty pages are skipped; if every
// page is empty a single blank page is emitted so the download still succeeds.
// Pure client-side (jsPDF) — works in local-only mode; un-downloadable assets
// fall back to their placeholder look.
export async function exportBoardToPdf(opts: ExportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const store = useShapeStore.getState();

  let pdf: import("jspdf").jsPDF | null = null;

  for (const page of opts.pages) {
    const shapes = store.listShapes(page.id);
    const raster = await renderPageToCanvas(shapes);
    if (!raster) continue; // empty page → no content box

    const orientation =
      raster.widthPx >= raster.heightPx ? "landscape" : "portrait";
    const pageHpt = PAGE_WIDTH_PT / raster.aspect;
    const format: [number, number] = [PAGE_WIDTH_PT, pageHpt];

    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: "pt", format });
    } else {
      pdf.addPage(format, orientation);
    }
    pdf.addImage(raster.dataUrl, "PNG", 0, 0, PAGE_WIDTH_PT, pageHpt);
  }

  if (!pdf) {
    // Every page was empty — emit one blank page so save() yields a file.
    pdf = new jsPDF({ unit: "pt", format: FALLBACK_FORMAT });
  }

  pdf.save(opts.filename ?? "board.pdf");
}
