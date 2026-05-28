import { useTextEditStore } from "../store/textEditStore";
import type { Tool } from "./types";

export function makeTextTool(): Tool {
  return {
    cursor: "text",
    onPointerDown(p, ctx) {
      // Opens the HTML text-edit overlay at the click location.
      useTextEditStore.getState().begin({
        editingId: null,
        worldX: p.x,
        worldY: p.y,
        width: 240,
        initial: "",
        font: "-apple-system, system-ui, sans-serif",
        size: Math.max(16, ctx.options.size * 4),
        color: ctx.options.color,
      });
    },
    onPointerMove(_p, _ctx) {},
    onPointerUp(_p, _ctx) {},
    onCancel(_ctx) {
      useTextEditStore.getState().end();
    },
  };
}
