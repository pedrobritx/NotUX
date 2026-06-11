import type { YArrow, YLine, YShape } from "@notux/types";
import { Arrow, Circle, Ellipse, Layer, Line, Rect } from "react-konva";
import type { DraftStore } from "../store/draftStore";
import { strokeOutline } from "../renderers/strokeGeometry";
import { arrowPoints } from "../renderers/ArrowRenderer";
import { polygonPoints } from "../renderers/PolygonRenderer";
import { shapeBounds } from "../tools/shapeOps";
import { resolveInkColor } from "../theme/adaptiveInk";
import { cssVar } from "../theme/cssVar";
import type { ViewportState } from "../viewport/Viewport";

interface Props {
  draft: Pick<
    DraftStore,
    | "stroke"
    | "rect"
    | "ellipse"
    | "polygon"
    | "line"
    | "arrow"
    | "marquee"
    | "guides"
  >;
  selectedShapes: YShape[];
  // Single-selected line/arrow: draws draggable endpoint dots instead of a box.
  endpointShapes?: Array<YLine | YArrow>;
  viewport: ViewportState;
  darkCanvas?: boolean;
}

// Renders in-flight tool previews and the selection bounding box. Cleared
// between gestures by the tool that produced the draft. Draft previews run
// through the same adaptive-ink mapping as committed shapes so what you see
// while drawing is what lands.
export function OverlayLayer({
  draft,
  selectedShapes,
  endpointShapes = [],
  viewport,
  darkCanvas = false,
}: Props) {
  const handleSize = 6 / viewport.scale;
  const selection = cssVar("--selection", "#5ac8fa");
  const selectionFill = cssVar("--selection-fill", "rgba(90, 200, 250, 0.10)");
  const guideColor = cssVar("--snap-guide", "#ffcc00");
  const ink = (c: string) => resolveInkColor(c, darkCanvas);

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
            fill={isHighlighter ? draft.stroke.color : ink(draft.stroke.color)}
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
          cornerRadius={draft.rect.radius ?? 0}
          stroke={ink(draft.rect.stroke)}
          fill={draft.rect.fill ?? undefined}
          strokeWidth={2}
          dash={[6 / viewport.scale, 4 / viewport.scale]}
        />
      )}

      {draft.polygon && (
        <Line
          x={draft.polygon.x}
          y={draft.polygon.y}
          points={polygonPoints(
            draft.polygon.variant,
            draft.polygon.w,
            draft.polygon.h,
          )}
          closed
          stroke={ink(draft.polygon.stroke)}
          fill={draft.polygon.fill ?? undefined}
          strokeWidth={2}
          lineJoin="round"
          dash={[6 / viewport.scale, 4 / viewport.scale]}
        />
      )}

      {draft.ellipse && (
        <Ellipse
          x={draft.ellipse.x + draft.ellipse.w / 2}
          y={draft.ellipse.y + draft.ellipse.h / 2}
          radiusX={draft.ellipse.w / 2}
          radiusY={draft.ellipse.h / 2}
          stroke={ink(draft.ellipse.stroke)}
          fill={draft.ellipse.fill ?? undefined}
          strokeWidth={2}
          dash={[6 / viewport.scale, 4 / viewport.scale]}
        />
      )}

      {draft.line && (
        <Line
          points={[draft.line.x1, draft.line.y1, draft.line.x2, draft.line.y2]}
          stroke={ink(draft.line.stroke)}
          strokeWidth={draft.line.width}
          lineCap="round"
        />
      )}

      {draft.arrow && (() => {
        const { points, tension } = arrowPoints({
          kind: "arrow",
          id: "draft",
          author: "",
          x1: draft.arrow.x1,
          y1: draft.arrow.y1,
          x2: draft.arrow.x2,
          y2: draft.arrow.y2,
          stroke: draft.arrow.stroke,
          width: draft.arrow.width,
          variant: draft.arrow.variant,
        });
        return (
          <Arrow
            points={points}
            tension={tension}
            stroke={ink(draft.arrow.stroke)}
            fill={ink(draft.arrow.stroke)}
            strokeWidth={draft.arrow.width}
            pointerLength={Math.max(8, draft.arrow.width * 3)}
            pointerWidth={Math.max(8, draft.arrow.width * 3)}
            lineCap="round"
            lineJoin="round"
          />
        );
      })()}

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

      {/* Endpoint dots for a single selected line/arrow (drag to reshape). */}
      {endpointShapes.map((s) =>
        (
          [
            [s.x1, s.y1, 1],
            [s.x2, s.y2, 2],
          ] as const
        ).map(([x, y, i]) => (
          <Circle
            key={`ep-${s.id}-${i}`}
            x={x}
            y={y}
            radius={7 / viewport.scale}
            fill="#ffffff"
            stroke={selection}
            strokeWidth={2 / viewport.scale}
            shadowColor="rgba(0,0,0,0.35)"
            shadowBlur={4 / viewport.scale}
            shadowOffsetY={1 / viewport.scale}
          />
        )),
      )}

      {/* Smart-alignment guides (Keynote-style) while dragging. */}
      {draft.guides.map((g, i) => (
        <Line
          key={`guide-${i}`}
          points={
            g.orientation === "v"
              ? [g.at, g.from, g.at, g.to]
              : [g.from, g.at, g.to, g.at]
          }
          stroke={guideColor}
          strokeWidth={1.5 / viewport.scale}
          listening={false}
        />
      ))}
    </Layer>
  );
}
