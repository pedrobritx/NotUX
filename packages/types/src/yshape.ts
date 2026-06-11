export type ToolKind =
  | "pen"
  | "highlighter"
  | "eraser"
  | "rect"
  | "ellipse"
  | "polygon"
  | "line"
  | "arrow"
  | "text"
  | "sticky"
  | "hand"
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
  // Corner radius in world units. undefined / 0 renders a sharp rectangle;
  // the "rounded square" shape sets this.
  radius?: number;
  // Stroke thickness in world units. undefined defaults to 2 (back-compat).
  strokeWidth?: number;
}

// Diamond and triangle share the drag-out box geometry of YRect; the `variant`
// picks which polygon is inscribed in the x/y/w/h box.
export interface YPolygon extends YShapeBase {
  kind: "polygon";
  variant: "diamond" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  stroke: string;
  fill: string | null;
  // Stroke thickness in world units. undefined defaults to 2 (back-compat).
  strokeWidth?: number;
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
  // Stroke thickness in world units. undefined defaults to 2 (back-compat).
  strokeWidth?: number;
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
  // Routing between the endpoints. undefined renders straight (back-compat).
  variant?: "straight" | "curved" | "elbow";
}

// Horizontal text alignment for text and sticky shapes. Optional for
// back-compat: undefined renders left for text, center for stickies.
export type TextAlign = "left" | "center" | "right";

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
  // Block-level formatting (applies to the entire text). Optional for
  // back-compat with text authored before rich-text support.
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlign;
}

export interface YSticky extends YShapeBase {
  kind: "sticky";
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  color: string;
  content: string;
  fontSize?: number;
  align?: TextAlign;
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

// Audio/video resource placed on the board. Rendered as a selectable Konva card
// (EmbedRenderer) with a live HTML player floated on top (MediaOverlayLayer),
// since Konva's <canvas> can't host <audio>/<iframe>.
//   - "audio":   uploaded file. `assetId` points at Storage (AssetKind "audio").
//   - "youtube": `url` is a youtube.com/embed/<id> URL.
//   - "gdrive":  `url` is a drive.google.com/file/d/<id>/preview URL.
export interface YEmbed extends YShapeBase {
  kind: "embed";
  embedType: "audio" | "youtube" | "gdrive";
  assetId?: string;
  url?: string;
  title: string;
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
  | YPolygon
  | YLine
  | YArrow
  | YText
  | YSticky
  | YAssetRef
  | YEmbed;

export type YShapeKind = YShape["kind"];
