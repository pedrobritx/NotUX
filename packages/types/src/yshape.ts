export type ToolKind =
  | "pen"
  | "highlighter"
  | "eraser"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "select";

// Visual variant of a freehand stroke. The canvas/tool discriminator stays
// `tool` ("pen" | "highlighter"); `style` is the finer instrument look the
// Liquid Glass dock writes (M7). Optional → strokes from before M7 render as
// plain pens.
export type StrokeStyle =
  | "pen"
  | "fineliner"
  | "pencil"
  | "marker"
  | "highlighter";

export interface YShapeBase {
  id: string;
  author: string;
  locked?: boolean;
  // Stacking order. undefined falls back to insertion order (see listShapes).
  z?: number;
  // 0..1. undefined renders fully opaque (highlighter strokes default to 0.35).
  opacity?: number;
}

export interface YStroke extends YShapeBase {
  kind: "stroke";
  tool: "pen" | "highlighter";
  // Instrument variant for rendering (caps, blend, texture). Optional for
  // back-compat with strokes authored before M7.
  style?: StrokeStyle;
  color: string;
  size: number;
  points: number[];
  pressure: number[];
}

export interface YRect extends YShapeBase {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  stroke: string;
  fill: string | null;
}

export interface YEllipse extends YShapeBase {
  kind: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  stroke: string;
  fill: string | null;
}

export interface YLine extends YShapeBase {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
}

export interface YArrow extends YShapeBase {
  kind: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
}

export interface YText extends YShapeBase {
  kind: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  content: string;
  font: string;
  size: number;
  color: string;
}

export interface YAssetRef extends YShapeBase {
  kind: "asset";
  assetId: string;
  pageIndex: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

export type YShape =
  | YStroke
  | YRect
  | YEllipse
  | YLine
  | YArrow
  | YText
  | YAssetRef;

export type YShapeKind = YShape["kind"];
