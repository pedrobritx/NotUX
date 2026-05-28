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

export interface YShapeBase {
  id: string;
  author: string;
  locked?: boolean;
}

export interface YStroke extends YShapeBase {
  kind: "stroke";
  tool: "pen" | "highlighter";
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
