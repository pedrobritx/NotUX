import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
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

// Every kind except line/arrow gets resize/rotate handles. Lines and arrows
// are endpoint-shaped: SelectTool drags their endpoint dots instead (see
// OverlayLayer), which is the better interaction for connectors.
function isTransformable(kind: YShape["kind"]): boolean {
  return kind !== "line" && kind !== "arrow";
}

// Media keeps its aspect ratio under the corner handles (Freeform-style);
// boxes and text resize freely.
function keepsRatio(kind: YShape["kind"]): boolean {
  return kind === "asset" || kind === "embed";
}

export function TransformLayer({
  selection,
  pageId,
  revision,
  shapesLayerRef,
}: Props) {
  const trRef = useRef<Konva.Transformer>(null);

  // Lock aspect when any selected shape is media, so a mixed selection never
  // distorts an image/PDF/video.
  const keepRatio = useMemo(() => {
    const store = useShapeStore.getState();
    for (const id of selection) {
      const s = store.getShape(pageId, id);
      if (s && !s.locked && keepsRatio(s.kind)) return true;
    }
    return false;
    // revision: re-evaluate when shapes change under a stable selection.
  }, [selection, pageId, revision]);

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

  // Bake the live Konva transform back into the model, then reset node
  // transform so the next gesture starts clean. Nodes live in world space
  // (the Stage carries the viewport), so no coordinate conversion is needed.
  // One transact => one undo entry for a multi-shape transform.
  function onTransformEnd() {
    const tr = trRef.current;
    if (!tr) return;
    const store = useShapeStore.getState();
    store.transact(() => {
      for (const node of tr.nodes()) {
        const id = node.name();
        const shape = store.getShape(pageId, id);
        if (!shape || shape.kind === "line" || shape.kind === "arrow") continue;

        if (shape.kind === "stroke") {
          // Freehand points are absolute world coords inside an origin Group:
          // run them through the node's local transform, scale the brush size
          // by the mean scale factor, then reset the node to identity.
          const m = node.getTransform().copy();
          const points = shape.points.slice();
          for (let i = 0; i < points.length; i += 2) {
            const p = m.point({ x: points[i] ?? 0, y: points[i + 1] ?? 0 });
            points[i] = p.x;
            points[i + 1] = p.y;
          }
          const meanScale =
            (Math.abs(node.scaleX()) + Math.abs(node.scaleY())) / 2;
          store.updateShape(pageId, id, {
            points,
            size: Math.max(0.5, shape.size * meanScale),
          });
          node.position({ x: 0, y: 0 });
          node.rotation(0);
          node.scaleX(1);
          node.scaleY(1);
          continue;
        }

        // Box kinds all carry x/y/w/h(+rot); the Group is anchored at the
        // shape's top-left, so node.x()/y() is the new top-left for every
        // kind (ellipse included).
        const w = Math.max(1, shape.w * node.scaleX());
        const h = Math.max(1, shape.h * node.scaleY());
        store.updateShape(pageId, id, {
          x: node.x(),
          y: node.y(),
          rot: node.rotation(),
          w,
          h,
          // Text scales with its box; sticky text follows the note size so
          // resizing feels like Freeform, not a reflow surprise.
          ...(shape.kind === "text"
            ? { size: Math.max(8, shape.size * node.scaleY()) }
            : {}),
          ...(shape.kind === "sticky"
            ? {
                fontSize: Math.max(
                  10,
                  (shape.fontSize ?? 18) *
                    Math.sqrt(Math.abs(node.scaleX() * node.scaleY())),
                ),
              }
            : {}),
        });
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
        keepRatio={keepRatio}
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
