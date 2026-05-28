import type { YShape } from "@notux/types";
import { forwardRef } from "react";
import { Group, Layer } from "react-konva";
import type Konva from "konva";
import { ArrowRenderer } from "../renderers/ArrowRenderer";
import { AssetRefRenderer } from "../renderers/AssetRefRenderer";
import { EllipseRenderer } from "../renderers/EllipseRenderer";
import { LineRenderer } from "../renderers/LineRenderer";
import { RectRenderer } from "../renderers/RectRenderer";
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
    case "line":
      return <LineRenderer shape={shape} selected={selected} />;
    case "arrow":
      return <ArrowRenderer shape={shape} selected={selected} />;
    case "text":
      return <TextRenderer shape={shape} selected={selected} />;
    case "asset":
      return <AssetRefRenderer shape={shape} selected={selected} />;
  }
}

export const ShapesLayer = forwardRef<Konva.Layer, Props>(function ShapesLayer(
  { shapes, selection },
  ref,
) {
  return (
    <Layer ref={ref}>
      {shapes.map((shape) => (
        <Group key={shape.id} name={shape.id}>
          {renderShape(shape, selection.has(shape.id))}
        </Group>
      ))}
    </Layer>
  );
});
