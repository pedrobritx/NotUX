import type { YShape } from "@notux/types";
import { Arrow, Ellipse, Layer, Line, Rect } from "react-konva";
import type { DraftStore } from "../store/draftStore";
import { strokeOutline } from "../renderers/strokeGeometry";
import { shapeBounds } from "../tools/shapeOps";
import { cssVar } from "../theme/cssVar";
import type { ViewportState } from "../viewport/Viewport";

interface Props {
  draft: Pick<
    DraftStore,
    "stroke" | "rect" | "ellipse" | "line" | "arrow" | "marquee"
  >;
  selectedShapes: YShape[];
  viewport: ViewportState;
}

// Renders in-flight tool previews and the selection bounding box. Cleared
// between gestures by the tool that produced the draft.
export function OverlayLayer({ draft, selectedShapes, viewport }: Props) {
  const handleSize = 6 / viewport.scale;
  const selection = cssVar("--selection", "#5ac8fa");
  const selectionFill = cssVar("--selection-fill", "rgba(90, 200, 250, 0.10)");

  return (
    <Layer listening={false}>
      {draft.stroke && (() => {
        const flat = strokeOutline(draft.stroke.points, draft.stroke.pressure, {
          size: draft.stroke.size,
        });
        const isHighlighter =
          draft.stroke.tool === "highlighter" ||
          draft.stroke.style === "highlighter";
        return (
          <Line
            points={flat}
            closed
            fill={draft.stroke.color}
            opacity={draft.stroke.opacity}
            globalCompositeOperation={isHighlighter ? "multiply" : undefined}
            lineCap="round"
            lineJoin="round"
          />
        );
      })()}

      {draft.rect && (
        <Rect
          x={draft.rect.x}
          y={draft.rect.y}
          width={draft.rect.w}
          height={draft.rect.h}
          stroke={draft.rect.stroke}
          fill={draft.rect.fill ?? undefined}
          strokeWidth={2}
          dash={[6 / viewport.scale, 4 / viewport.scale]}
        />
      )}

      {draft.ellipse && (
        <Ellipse
          x={draft.ellipse.x + draft.ellipse.w / 2}
          y={draft.ellipse.y + draft.ellipse.h / 2}
          radiusX={draft.ellipse.w / 2}
          radiusY={draft.ellipse.h / 2}
          stroke={draft.ellipse.stroke}
          fill={draft.ellipse.fill ?? undefined}
          strokeWidth={2}
          dash={[6 / viewport.scale, 4 / viewport.scale]}
        />
      )}

      {draft.line && (
        <Line
          points={[draft.line.x1, draft.line.y1, draft.line.x2, draft.line.y2]}
          stroke={draft.line.stroke}
          strokeWidth={draft.line.width}
          lineCap="round"
        />
      )}

      {draft.arrow && (
        <Arrow
          points={[draft.arrow.x1, draft.arrow.y1, draft.arrow.x2, draft.arrow.y2]}
          stroke={draft.arrow.stroke}
          fill={draft.arrow.stroke}
          strokeWidth={draft.arrow.width}
          pointerLength={Math.max(8, draft.arrow.width * 3)}
          pointerWidth={Math.max(8, draft.arrow.width * 3)}
          lineCap="round"
        />
      )}

      {draft.marquee && (
        <Rect
          x={draft.marquee.x}
          y={draft.marquee.y}
          width={draft.marquee.w}
          height={draft.marquee.h}
          stroke={selection}
          fill={selectionFill}
          strokeWidth={1 / viewport.scale}
          dash={[6 / viewport.scale, 4 / viewport.scale]}
        />
      )}

      {selectedShapes.map((shape) => {
        const b = shapeBounds(shape);
        if (b.w <= 0 && b.h <= 0) return null;
        return (
          <Rect
            key={`sel-${shape.id}`}
            x={b.x - handleSize}
            y={b.y - handleSize}
            width={b.w + handleSize * 2}
            height={b.h + handleSize * 2}
            stroke={shape.locked ? "#ffd60a" : selection}
            strokeWidth={1.5 / viewport.scale}
            dash={[5 / viewport.scale, 3 / viewport.scale]}
          />
        );
      })}
    </Layer>
  );
}
