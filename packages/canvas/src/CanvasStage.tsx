import type Konva from "konva";
import type { ToolKind, YShape } from "@notux/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";
import { newAuthorId } from "./ids";
import { useAwareness } from "./hooks/useAwareness";
import { useUndoManager } from "./hooks/useUndoManager";
import { BackgroundLayer } from "./layers/BackgroundLayer";
import { OverlayLayer } from "./layers/OverlayLayer";
import { PresenceLayer } from "./layers/PresenceLayer";
import { ShapesLayer } from "./layers/ShapesLayer";
import { TransformLayer } from "./layers/TransformLayer";
import { useAssetStore } from "./store/assetStore";
import { useCommandStore } from "./store/commandStore";
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
  // Changing this (the app's active theme) re-renders the Konva layers so they
  // re-read CSS-variable colors via cssVar(). The value itself is unused.
  theme?: string;
}

const ZOOM_PER_WHEEL_PIXEL = 0.0015;
const PAN_PER_WHEEL_PIXEL = 1;

function toolCursor(tool: ToolKind): string {
  switch (tool) {
    case "select":
      return "default";
    case "hand":
      return "grab";
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

export function CanvasStage({
  boardId: _boardId,
  pageId = DEFAULT_PAGE_ID,
  theme: _theme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const shapesLayerRef = useRef<Konva.Layer>(null);
  const authorIdRef = useRef<string>(newAuthorId());

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const { undo, redo, canUndo, canRedo } = useUndoManager();
  const awareness = useAwareness();

  // Register undo/redo + zoom so the app menu (outside the canvas) can drive
  // them. Re-registers when handlers or canvas size change.
  const sizeRef = useRef(size);
  sizeRef.current = size;
  useEffect(() => {
    const zoomBy = (factor: number) =>
      setViewport((v) =>
        zoomAt(v, sizeRef.current.w / 2, sizeRef.current.h / 2, v.scale * factor),
      );
    useCommandStore.getState().register({
      undo,
      redo,
      canUndo,
      canRedo,
      zoomIn: () => zoomBy(1.2),
      zoomOut: () => zoomBy(1 / 1.2),
      zoomReset: () => setViewport((v) => ({ ...v, scale: 1 })),
    });
  }, [undo, redo, canUndo, canRedo]);

  // Publish the local cursor (world coords) to awareness, throttled to one
  // update per animation frame so rapid pointer moves don't flood the channel.
  const cursorRafRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
  const publishCursor = useCallback(
    (world: { x: number; y: number }) => {
      if (!awareness) return;
      pendingCursorRef.current = world;
      if (cursorRafRef.current !== null) return;
      cursorRafRef.current = requestAnimationFrame(() => {
        cursorRafRef.current = null;
        awareness.setLocalStateField("cursor", pendingCursorRef.current);
      });
    },
    [awareness],
  );

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

  // Keep the asset store aware of the current viewport/size/page/author so a
  // button-triggered import (which has no drop point) lands at the canvas centre
  // and is attributed to this canvas's author.
  useEffect(() => {
    useAssetStore.getState().setCanvasInfo({
      viewport,
      size,
      pageId,
      authorId: authorIdRef.current,
    });
  }, [viewport, size, pageId]);

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

  // Space-to-pan, undo/redo, and tool keyboard handlers (Delete, Escape).
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      // Arrange (z-order): Cmd/Ctrl+] forward, +Shift to front; [ backward,
      // +Shift to back. Only intercept when something is selected, so the
      // browser's history nav still works on an empty canvas.
      if (mod && (e.key === "]" || e.key === "[")) {
        const ids = Array.from(useToolStore.getState().selection);
        if (ids.length === 0) return;
        e.preventDefault();
        const store = useShapeStore.getState();
        if (e.key === "]") {
          if (e.shiftKey) store.bringToFront(pageId, ids);
          else store.bringForward(pageId, ids);
        } else if (e.shiftKey) {
          store.sendToBack(pageId, ids);
        } else {
          store.sendBackward(pageId, ids);
        }
        return;
      }
      // Lock toggle: Cmd/Ctrl+Shift+L (Shift required to avoid Cmd+L).
      if (mod && e.shiftKey && (e.key === "l" || e.key === "L")) {
        const ids = Array.from(useToolStore.getState().selection);
        if (ids.length === 0) return;
        e.preventDefault();
        const store = useShapeStore.getState();
        const allLocked = ids.every((id) => store.getShape(pageId, id)?.locked);
        store.transact(() =>
          ids.forEach((id) => store.setLocked(pageId, id, !allLocked)),
        );
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
  }, [buildToolContext, undo, redo, pageId]);

  // Publish the local selection to awareness so peers can highlight it.
  useEffect(() => {
    awareness?.setLocalStateField("selection", Array.from(selection));
  }, [awareness, selection]);

  // Clear our presence when the canvas unmounts (navigate away from the board).
  useEffect(() => {
    return () => {
      if (cursorRafRef.current !== null) cancelAnimationFrame(cursorRafRef.current);
      awareness?.setLocalStateField("cursor", null);
    };
  }, [awareness]);

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
      if (native.button === 1 || spaceHeld || tool === "hand") {
        evt.preventDefault();
        panRef.current = { active: true, lastX: native.clientX, lastY: native.clientY };
        evt.currentTarget.setPointerCapture(native.pointerId);
        return;
      }
      if (native.button !== 0) return;
      // If the pointer landed on a Transformer handle, let Konva drive the
      // resize/rotate; don't also start a SelectTool drag on the shape below.
      const stage = stageRef.current;
      if (stage) {
        const rect = containerRef.current?.getBoundingClientRect();
        const sx = native.clientX - (rect?.left ?? 0);
        const sy = native.clientY - (rect?.top ?? 0);
        let n: Konva.Node | null = stage.getIntersection({ x: sx, y: sy });
        while (n) {
          if (n.getClassName() === "Transformer") return;
          n = n.getParent();
        }
      }
      evt.currentTarget.setPointerCapture(native.pointerId);
      toolRef.current.onPointerDown(pointerToToolPoint(native), buildToolContext());
    },
    [spaceHeld, tool, viewport, buildToolContext],
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
      const point = pointerToToolPoint(native);
      publishCursor({ x: point.x, y: point.y });
      toolRef.current.onPointerMove(point, buildToolContext());
    },
    [viewport, buildToolContext, publishCursor],
  );

  // Hide our cursor for peers when the pointer leaves the canvas.
  const onPointerLeave = useCallback(() => {
    if (cursorRafRef.current !== null) {
      cancelAnimationFrame(cursorRafRef.current);
      cursorRafRef.current = null;
    }
    awareness?.setLocalStateField("cursor", null);
  }, [awareness]);

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

  // File drag-and-drop import. dragover must preventDefault for drop to fire.
  const onDragOver = useCallback((evt: React.DragEvent<HTMLDivElement>) => {
    if (!evt.dataTransfer.types.includes("Files")) return;
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (evt: React.DragEvent<HTMLDivElement>) => {
      const files = evt.dataTransfer.files;
      if (!files || files.length === 0) return;
      evt.preventDefault();
      if (!useAssetStore.getState().canImport) {
        console.warn("Import requires Supabase to be configured");
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      const sx = evt.clientX - (rect?.left ?? 0);
      const sy = evt.clientY - (rect?.top ?? 0);
      const world = screenToWorld(viewport, sx, sy);
      void useAssetStore.getState().importAt(files, world);
    },
    [viewport],
  );

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
      if (hit && hit.kind === "text" && !hit.locked) {
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
      } else if (hit && hit.kind === "sticky" && !hit.locked) {
        const pad = 14;
        useTextEditStore.getState().begin({
          editingId: hit.id,
          worldX: hit.x + pad,
          worldY: hit.y + pad,
          width: Math.max(40, hit.w - pad * 2),
          initial: hit.content,
          font: "-apple-system, system-ui, sans-serif",
          size: hit.fontSize ?? 18,
          color: "#1c1c1e",
        });
      }
    },
    [viewport, hitTestWorld],
  );

  const selectedShapes = useMemo(
    () => shapes.filter((s) => selection.has(s.id)),
    [shapes, selection],
  );

  // The Transformer draws handles for transformable, unlocked shapes; the
  // dashed OverlayLayer box covers the rest (strokes, lines, arrows) plus any
  // locked shape (which the Transformer skips, and which renders amber).
  const overlayShapes = useMemo(
    () =>
      selectedShapes.filter(
        (s) =>
          s.locked ||
          s.kind === "stroke" ||
          s.kind === "line" ||
          s.kind === "arrow",
      ),
    [selectedShapes],
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
      onPointerLeave={onPointerLeave}
      onWheel={onWheel}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
        <PresenceLayer awareness={awareness} viewport={viewport} />
      </Stage>
      <TextEditorOverlay
        viewport={viewport}
        pageId={pageId}
        authorId={authorIdRef.current}
      />
    </div>
  );
}
