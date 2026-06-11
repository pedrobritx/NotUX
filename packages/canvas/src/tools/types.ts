import type { YShape } from "@notux/types";
import type { DraftStore } from "../store/draftStore";
import type { ShapeStore } from "../store/shapeStore";
import type { ToolOptions } from "../store/toolStore";

export interface ToolEventPoint {
  x: number;
  y: number;
  pressure: number;
  shift: boolean;
  // Alt/Option temporarily disables magnetic snapping while dragging.
  alt?: boolean;
}

export interface ToolContext {
  store: ShapeStore;
  draftStore: DraftStore;
  pageId: string;
  authorId: string;
  options: ToolOptions;
  // Returns the topmost shape at a world point, or undefined.
  hitTest(p: { x: number; y: number }): YShape | undefined;
  // Returns shapes whose bounds intersect a world rect (for marquee).
  rectIntersect(r: { x: number; y: number; w: number; h: number }): YShape[];
  // The current selection, sourced from toolStore.
  getSelection(): Set<string>;
  setSelection(ids: Iterable<string>): void;
  // For tools that need DOM coordinates (e.g. TextTool's HTML input overlay).
  worldToContainer(p: { x: number; y: number }): { x: number; y: number };
}

export interface Tool {
  cursor: string;
  onPointerDown(p: ToolEventPoint, ctx: ToolContext): void;
  onPointerMove(p: ToolEventPoint, ctx: ToolContext): void;
  onPointerUp(p: ToolEventPoint, ctx: ToolContext): void;
  onCancel(ctx: ToolContext): void;
  // Optional keyboard handler. Used by SelectTool for Delete/Backspace.
  onKeyDown?(e: KeyboardEvent, ctx: ToolContext): void;
}
