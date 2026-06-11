import type { StrokeStyle } from "@notux/types";
import { create } from "zustand";
import type { SnapGuide } from "../tools/snapping";

export interface DraftStroke {
  tool: "pen" | "highlighter";
  style: StrokeStyle;
  color: string;
  size: number;
  opacity: number;
  points: number[];
  pressure: number[];
}

export interface DraftRect {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string | null;
  // Corner radius for the rounded-square preview.
  radius?: number;
}

export interface DraftPolygon {
  variant: "diamond" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string | null;
}

export interface DraftLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
  // Arrow routing for the preview (matches YArrow.variant).
  variant?: "straight" | "curved" | "elbow";
}

interface DraftStoreState {
  stroke: DraftStroke | null;
  rect: DraftRect | null;
  ellipse: DraftRect | null;
  polygon: DraftPolygon | null;
  line: DraftLine | null;
  arrow: DraftLine | null;
  marquee: { x: number; y: number; w: number; h: number } | null;
  // Live smart-alignment guides while dragging (SelectTool writes).
  guides: SnapGuide[];
  setStroke(s: DraftStroke | null): void;
  setRect(r: DraftRect | null): void;
  setEllipse(r: DraftRect | null): void;
  setPolygon(p: DraftPolygon | null): void;
  setLine(l: DraftLine | null): void;
  setArrow(l: DraftLine | null): void;
  setMarquee(m: { x: number; y: number; w: number; h: number } | null): void;
  setGuides(guides: SnapGuide[]): void;
  clear(): void;
}

// In-flight tool previews live here. Tools write; OverlayLayer reads.
// Kept separate from the committed ShapeStore so an aborted gesture is a
// single .clear() call and doesn't leak into the real document.
export const useDraftStore = create<DraftStoreState>((set) => ({
  stroke: null,
  rect: null,
  ellipse: null,
  polygon: null,
  line: null,
  arrow: null,
  marquee: null,
  guides: [],
  setStroke(s) {
    set({ stroke: s });
  },
  setRect(r) {
    set({ rect: r });
  },
  setEllipse(r) {
    set({ ellipse: r });
  },
  setPolygon(p) {
    set({ polygon: p });
  },
  setLine(l) {
    set({ line: l });
  },
  setArrow(l) {
    set({ arrow: l });
  },
  setMarquee(m) {
    set({ marquee: m });
  },
  setGuides(guides) {
    set({ guides });
  },
  clear() {
    set({
      stroke: null,
      rect: null,
      ellipse: null,
      polygon: null,
      line: null,
      arrow: null,
      marquee: null,
      guides: [],
    });
  },
}));

export type DraftStore = DraftStoreState;
