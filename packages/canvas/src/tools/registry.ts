import type { ToolKind } from "@notux/types";
import { makeArrowTool } from "./ArrowTool";
import { makeEllipseTool } from "./EllipseTool";
import { makeEraserTool } from "./EraserTool";
import { makeLineTool } from "./LineTool";
import { makePenTool } from "./PenTool";
import { makePolygonTool } from "./PolygonTool";
import { makeRectTool } from "./RectTool";
import { makeSelectTool } from "./SelectTool";
import { makeStickyTool } from "./StickyTool";
import { makeTextTool } from "./TextTool";
import type { Tool } from "./types";

// The hand tool carries no drawing behaviour; CanvasStage routes pointer events
// to panning whenever the active tool is "hand".
function makeHandTool(): Tool {
  return {
    cursor: "grab",
    onPointerDown() {},
    onPointerMove() {},
    onPointerUp() {},
    onCancel() {},
  };
}

export function makeTool(kind: ToolKind): Tool {
  switch (kind) {
    case "pen":
      return makePenTool("pen");
    case "highlighter":
      return makePenTool("highlighter");
    case "eraser":
      return makeEraserTool();
    case "rect":
      return makeRectTool();
    case "ellipse":
      return makeEllipseTool();
    case "polygon":
      return makePolygonTool();
    case "line":
      return makeLineTool();
    case "arrow":
      return makeArrowTool();
    case "text":
      return makeTextTool();
    case "sticky":
      return makeStickyTool();
    case "hand":
      return makeHandTool();
    case "select":
      return makeSelectTool();
  }
}
