import type { ToolKind } from "@notux/types";
import { makeArrowTool } from "./ArrowTool";
import { makeEllipseTool } from "./EllipseTool";
import { makeEraserTool } from "./EraserTool";
import { makeLineTool } from "./LineTool";
import { makePenTool } from "./PenTool";
import { makeRectTool } from "./RectTool";
import { makeSelectTool } from "./SelectTool";
import { makeTextTool } from "./TextTool";
import type { Tool } from "./types";

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
    case "line":
      return makeLineTool();
    case "arrow":
      return makeArrowTool();
    case "text":
      return makeTextTool();
    case "select":
      return makeSelectTool();
  }
}
