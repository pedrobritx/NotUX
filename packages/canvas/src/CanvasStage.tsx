import type Konva from "konva";
import type { ToolKind, YShape } from "@notux/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";
import { newAuthorId } from "./ids";
import { BackgroundLayer } from "./layers/BackgroundLayer";
import { OverlayLayer } from "./layers/OverlayLayer";
import { ShapesLayer } from "./layers/ShapesLayer";
import { useDraftStore } from "./store/draftStore";
import { DEFAULT_PAGE_ID } from "./store/pageStore";
import { useShapeStore } from "./store/shapeStore";
import { useTextEditStore } from "./store/textEditStore";
import { useToolStore } from "./store/toolStore";
import { TextEditorOverlay } from "./TextEditorOverlay";
import { makeTool } from "./tools/registry";
import { boundsIntersect, shapeBounds } from "./tools/shapeOps";
import type { Tool, ToolContext, ToolEventPoint } from "./tools/types";
import { screenToWorld, zoomAt } from "./viewport/Viewport";

interface Props {
  boardId: string;
  pageId?: string;
}

const ZOOM_PER_WHEEL_PIXEL = 0.0015;
const PAN_PER_WHEEL_PIXEL = 1;

function toolCursor(tool: ToolKind): string {
  switch (tool) {
    case "select":
      return "default";
    case "text":
      return "text";
    case "eraser":
      return "cell";
    default:
      return "crosshair";
  }
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

export function CanvasStage({ boardId: _boardId, pageId = DEFAULT_PAGE_ID }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const shapesLayerRef = useRef<Konva.Layer>(null);
  const authorIdRef = useRef<string>(newAuthorId());

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const tool = useToolStore((s) => s.tool);
  const selection = useToolStore((s) => s.selection);
  const revision = useShapeStore((s) => s.revision);
  const shapes = useMemo(
    () => useShapeStore.getState().listShapes(pageId),
    [pageId, revision],
  );
  const draft = useDraftStore();

  // Resize observer.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // Hit test — converts world point to container coords and asks Konva.
  const hitTestWorld = useCallback(
    (p: { x: number; y: number }): YShape | undefined => {
      const layer = shapesLayerRef.current;
      if (!layer) return undefined;
      const screen = {
        x: p.x * viewport.scale + viewport.x,
        y: p.y * viewport.scale + viewport.y,
      };
      const node = layer.getIntersection(screen);
      if (!node) return undefined;
      let cur: Konva.Node | null = node;
      while (cur && cur !== layer) {
        const name = cur.name();
        if (name) return useShapeStore.getState().getShape(pageId, name);
        cur = cur.getParent();
      }
      return undefined;
    },
    [pageId, viewport.scale, viewport.x, viewport.y],
  );

  // Snapshot of ToolContext rebuilt per event. Cheap to construct; reads from
  // store getState() so it always sees current state.
  const buildToolContext = useCallback((): ToolContext => {
    const store = useShapeStore.getState();
    const draftStore = useDraftStore.getState();
    const toolStore = useToolStore.getState();
    return {
      store,
      draftStore,
      pageId,
      authorId: authorIdRef.current,
      options: toolStore.options,
      hitTest: hitTestWorld,
      rectIntersect(r) {
        return store
          .listShapes(pageId)
          .filter((s) => boundsIntersect(shapeBounds(s), r));
      },
      getSelection() {
        return useToolStore.getState().selection;
      },
      setSelection(ids) {
        useToolStore.getState().setSelection(ids);
      },
      worldToContainer(p) {
        return {
          x: p.x * viewport.scale + viewport.x,
          y: p.y * viewport.scale + viewport.y,
        };
      },
    };
  }, [hitTestWorld, pageId, viewport.scale, viewport.x, viewport.y]);

  // Tool lifecycle: instantiate on kind change, cancel the outgoing one so
  // any in-flight draft is cleaned up.
  const toolRef = useRef<Tool>(makeTool(tool));
  useEffect(() => {
    const prev = toolRef.current;
    prev.onCancel(buildToolContext());
    toolRef.current = makeTool(tool);
  }, [tool, buildToolContext]);

  // Space-to-pan + tool keyboard handlers (Delete, Escape).
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }
      const handler = toolRef.current.onKeyDown;
      if (handler) handler(e, buildToolContext());
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [buildToolContext]);

  const panRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  function pointerToToolPoint(evt: PointerEvent): ToolEventPoint {
    const rect = containerRef.current?.getBoundingClientRect();
    const sx = (rect ? evt.clientX - rect.left : evt.clientX);
    const sy = (rect ? evt.clientY - rect.top : evt.clientY);
    const w = screenToWorld(viewport, sx, sy);
    return {
      x: w.x,
      y: w.y,
      pressure: evt.pressure > 0 ? evt.pressure : 0.5,
      shift: evt.shiftKey,
    };
  }

  const onPointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      const native = evt.nativeEvent;
      if (native.button === 1 || spaceHeld) {
        evt.preventDefault();
        panRef.current = { active: true, lastX: native.clientX, lastY: native.clientY };
        evt.currentTarget.setPointerCapture(native.pointerId);
        return;
      }
      if (native.button !== 0) return;
      evt.currentTarget.setPointerCapture(native.pointerId);
      toolRef.current.onPointerDown(pointerToToolPoint(native), buildToolContext());
    },
    [spaceHeld, viewport, buildToolContext],
  );

  const onPointerMove = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      const native = evt.nativeEvent;
      if (panRef.current.active) {
        const dx = native.clientX - panRef.current.lastX;
        const dy = native.clientY - panRef.current.lastY;
        panRef.current.lastX = native.clientX;
        panRef.current.lastY = native.clientY;
        setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
        return;
      }
      toolRef.current.onPointerMove(pointerToToolPoint(native), buildToolContext());
    },
    [viewport, buildToolContext],
  );

  const onPointerUp = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      const native = evt.nativeEvent;
      if (panRef.current.active) {
        panRef.current.active = false;
        evt.currentTarget.releasePointerCapture(native.pointerId);
        return;
      }
      evt.currentTarget.releasePointerCapture(native.pointerId);
      toolRef.current.onPointerUp(pointerToToolPoint(native), buildToolContext());
    },
    [viewport, buildToolContext],
  );

  const onWheel = useCallback((evt: React.WheelEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = evt.clientX - rect.left;
    const sy = evt.clientY - rect.top;
    if (evt.ctrlKey || evt.metaKey) {
      const factor = Math.exp(-evt.deltaY * ZOOM_PER_WHEEL_PIXEL);
      setViewport((v) => zoomAt(v, sx, sy, v.scale * factor));
    } else {
      setViewport((v) => ({
        ...v,
        x: v.x - evt.deltaX * PAN_PER_WHEEL_PIXEL,
        y: v.y - evt.deltaY * PAN_PER_WHEEL_PIXEL,
      }));
    }
  }, []);

  // Suppress browser-level zoom on wheel by attaching a non-passive listener.
  // React's onWheel handler is passive in newer React versions and can't
  // preventDefault, so we add a native listener for that purpose.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, []);

  // Double-click promotes an existing YText into edit mode.
  const onDoubleClick = useCallback(
    (evt: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      const w = screenToWorld(viewport, sx, sy);
      const hit = hitTestWorld(w);
      if (hit && hit.kind === "text") {
        useTextEditStore.getState().begin({
          editingId: hit.id,
          worldX: hit.x,
          worldY: hit.y,
          width: hit.w,
          initial: hit.content,
          font: hit.font,
          size: hit.size,
          color: hit.color,
        });
      }
    },
    [viewport, hitTestWorld],
  );

  const selectedShapes = useMemo(
    () => shapes.filter((s) => selection.has(s.id)),
    [shapes, selection],
  );

  const cursor = spaceHeld ? "grab" : toolCursor(tool);

  return (
    <div
      ref={containerRef}
      className="board__canvas"
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
        cursor,
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        listening
      >
        <BackgroundLayer viewport={viewport} width={size.w} height={size.h} />
        <ShapesLayer ref={shapesLayerRef} shapes={shapes} selection={selection} />
        <OverlayLayer draft={draft} selectedShapes={selectedShapes} viewport={viewport} />
      </Stage>
      <TextEditorOverlay
        viewport={viewport}
        pageId={pageId}
        authorId={authorIdRef.current}
      />
    </div>
  );
}
