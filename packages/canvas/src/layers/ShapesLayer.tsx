import type { YShape } from "@notux/types";
import { forwardRef } from "react";
import { Group, Layer } from "react-konva";
import type Konva from "konva";
import { ArrowRenderer } from "../renderers/ArrowRenderer";
import { AssetRefRenderer } from "../renderers/AssetRefRenderer";
import { EllipseRenderer } from "../renderers/EllipseRenderer";
import { LineRenderer } from "../renderers/LineRenderer";
import { PolygonRenderer } from "../renderers/PolygonRenderer";
import { RectRenderer } from "../renderers/RectRenderer";
import { StickyRenderer } from "../renderers/StickyRenderer";
import { StrokeRenderer } from "../renderers/StrokeRenderer";
import { TextRenderer } from "../renderers/TextRenderer";

interface Props {
  shapes: YShape[];
  selection: Set<string>;
}

function renderShape(shape: YShape, selected: boolean) {
  switch (shape.kind) {
    case "stroke":
      return <StrokeRenderer shape={shape} selected={selected} />;
    case "rect":
      return <RectRenderer shape={shape} selected={selected} />;
    case "ellipse":
      return <EllipseRenderer shape={shape} selected={selected} />;
    case "polygon":
      return <PolygonRenderer shape={shape} selected={selected} />;
    case "line":
      return <LineRenderer shape={shape} selected={selected} />;
    case "arrow":
      return <ArrowRenderer shape={shape} selected={selected} />;
    case "text":
      return <TextRenderer shape={shape} selected={selected} />;
    case "sticky":
      return <StickyRenderer shape={shape} selected={selected} />;
    case "asset":
      return <AssetRefRenderer shape={shape} selected={selected} />;
  }
}

// Box kinds carry their position/rotation on the wrapping Group so the Konva
// Transformer pivots around the shape's own origin. Stroke/line/arrow draw at
// absolute coords inside a Group left at the origin.
function groupTransform(shape: YShape): {
  x?: number;
  y?: number;
  rotation?: number;
} {
  switch (shape.kind) {
    case "rect":
    case "ellipse":
    case "polygon":
    case "text":
    case "sticky":
    case "asset":
      return { x: shape.x, y: shape.y, rotation: shape.rot ?? 0 };
    default:
      return {};
  }
}

function groupOpacity(shape: YShape): number {
  if (shape.opacity !== undefined) return shape.opacity;
  if (shape.kind === "stroke" && shape.tool === "highlighter") return 0.35;
  return 1;
}

export const ShapesLayer = forwardRef<Konva.Layer, Props>(function ShapesLayer(
  { shapes, selection },
  ref,
) {
  return (
    <Layer ref={ref}>
      {shapes.map((shape) => (
        <Group
          key={shape.id}
          name={shape.id}
          opacity={groupOpacity(shape)}
          {...groupTransform(shape)}
        >
          {renderShape(shape, selection.has(shape.id))}
        </Group>
      ))}
    </Layer>
  );
});
