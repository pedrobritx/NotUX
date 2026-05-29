import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { Layer, Transformer } from "react-konva";
import type Konva from "konva";
import type { YShape } from "@notux/types";
import { useShapeStore } from "../store/shapeStore";

interface Props {
  selection: Set<string>;
  pageId: string;
  // Re-bind the Transformer's nodes whenever shapes change (e.g. z-order).
  revision: number;
  shapesLayerRef: RefObject<Konva.Layer | null>;
}

// v0: only box kinds get resize/rotate handles. Strokes are freehand point
// clouds and line/arrow are endpoint-shaped — both keep move-only (drag) and
// show the dashed OverlayLayer box instead.
function isTransformable(kind: YShape["kind"]): boolean {
  return (
    kind === "rect" || kind === "ellipse" || kind === "text" || kind === "asset"
  );
}

export function TransformLayer({
  selection,
  pageId,
  revision,
  shapesLayerRef,
}: Props) {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const tr = trRef.current;
    const layer = shapesLayerRef.current;
    if (!tr || !layer) return;
    const store = useShapeStore.getState();
    const nodes: Konva.Node[] = [];
    for (const id of selection) {
      const shape = store.getShape(pageId, id);
      if (!shape || shape.locked || !isTransformable(shape.kind)) continue;
      const node = layer.findOne((n: Konva.Node) => n.name() === id);
      if (node) nodes.push(node);
    }
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selection, revision, pageId, shapesLayerRef]);

  // Bake the live Konva transform back into the model, then reset node scale so
  // the next gesture starts clean. Nodes live in world space (the Stage carries
  // the viewport), so no coordinate conversion is needed. One transact => one
  // undo entry for a multi-shape transform.
  function onTransformEnd() {
    const tr = trRef.current;
    if (!tr) return;
    const store = useShapeStore.getState();
    store.transact(() => {
      for (const node of tr.nodes()) {
        const id = node.name();
        const shape = store.getShape(pageId, id);
        if (!shape || !isTransformable(shape.kind)) continue;
        // Narrowed: rect | ellipse | text | asset — all carry w/h, and the
        // Group is anchored at the shape's top-left, so node.x()/y() is the
        // new top-left for every kind (ellipse included).
        if (
          shape.kind === "rect" ||
          shape.kind === "ellipse" ||
          shape.kind === "text" ||
          shape.kind === "asset"
        ) {
          const w = Math.max(1, shape.w * node.scaleX());
          const h = Math.max(1, shape.h * node.scaleY());
          store.updateShape(pageId, id, {
            x: node.x(),
            y: node.y(),
            rot: node.rotation(),
            w,
            h,
            ...(shape.kind === "text"
              ? { size: Math.max(8, shape.size * node.scaleY()) }
              : {}),
          });
        }
        node.scaleX(1);
        node.scaleY(1);
      }
    });
  }

  return (
    <Layer>
      <Transformer
        ref={trRef}
        rotateEnabled
        keepRatio={false}
        flipEnabled={false}
        ignoreStroke
        boundBoxFunc={(oldBox, newBox) =>
          newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
        }
        onTransformEnd={onTransformEnd}
      />
    </Layer>
  );
}
