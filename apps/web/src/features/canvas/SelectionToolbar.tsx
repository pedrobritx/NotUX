import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { TextAlign, YShape } from "@notux/types";
import { Icon, Popover, Slider, Swatch, type IconName } from "@notux/ui";
import {
  alignShapes,
  distributeShapes,
  newShapeId,
  shapeBounds,
  translateShape,
  useShapeStore,
  useTextEditStore,
  useToolStore,
  useViewportStore,
  type AlignEdge,
} from "@notux/canvas";
import { COLORS, THICKNESS_PRESETS } from "./palette";
import { recordRecentColor, useRecentColors } from "./useRecentColors";

// Contextual selection toolbar (Freeform/FigJam-style): a compact glass pill
// that floats next to the selected objects, shows only the controls that
// apply, and tucks detail behind popovers. Replaces the old fixed right-side
// inspector panel, cutting cursor travel to near zero.

const GAP = 12;
// Keep clear of the dock (top-center) when flipping above tall selections.
const TOP_SAFE = 72;
const EDGE = 8;

const ALIGN_TEXT_OPTIONS: Array<{ id: TextAlign; icon: IconName; label: string }> = [
  { id: "left", icon: "align-left", label: "Align text left" },
  { id: "center", icon: "align-center", label: "Align text center" },
  { id: "right", icon: "align-right", label: "Align text right" },
];

const ALIGN_OBJECT_OPTIONS: Array<{ id: AlignEdge; icon: IconName; label: string }> = [
  { id: "left", icon: "obj-align-left", label: "Align left edges" },
  { id: "hcenter", icon: "obj-align-center", label: "Align horizontal centers" },
  { id: "right", icon: "obj-align-right", label: "Align right edges" },
  { id: "top", icon: "obj-align-top", label: "Align top edges" },
  { id: "vcenter", icon: "obj-align-middle", label: "Align vertical centers" },
  { id: "bottom", icon: "obj-align-bottom", label: "Align bottom edges" },
];

// The stroke/outline color a shape exposes for editing (asset has none).
function shapeColor(s: YShape): string | undefined {
  switch (s.kind) {
    case "rect":
    case "ellipse":
    case "polygon":
    case "line":
    case "arrow":
      return s.stroke;
    case "text":
    case "stroke":
    case "sticky":
      return s.color;
    case "asset":
    case "embed":
      return undefined;
  }
}

function colorPatch(s: YShape, color: string): Partial<YShape> | null {
  switch (s.kind) {
    case "rect":
    case "ellipse":
    case "polygon":
    case "line":
    case "arrow":
      return { stroke: color };
    case "text":
    case "stroke":
    case "sticky":
      return { color };
    case "asset":
    case "embed":
      return null;
  }
}

function shapeThickness(s: YShape): number | undefined {
  switch (s.kind) {
    case "rect":
    case "ellipse":
    case "polygon":
      return s.strokeWidth ?? 2;
    case "line":
    case "arrow":
      return s.width;
    default:
      return undefined;
  }
}

function thicknessPatch(s: YShape, thickness: number): Partial<YShape> | null {
  switch (s.kind) {
    case "rect":
    case "ellipse":
    case "polygon":
      return { strokeWidth: thickness };
    case "line":
    case "arrow":
      return { width: thickness };
    default:
      return null;
  }
}

// The common value across the selection, or "mixed" when they differ.
function shared<T>(
  items: YShape[],
  pick: (s: YShape) => T | undefined,
): T | "mixed" | undefined {
  let acc: T | undefined;
  let seen = false;
  for (const s of items) {
    const v = pick(s);
    if (v === undefined) continue;
    if (!seen) {
      acc = v;
      seen = true;
    } else if (acc !== v) {
      return "mixed";
    }
  }
  return seen ? acc : undefined;
}

interface BarButtonProps {
  icon: IconName;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick(): void;
  innerRef?: RefObject<HTMLButtonElement>;
}

function BarButton({ icon, label, active, danger, onClick, innerRef }: BarButtonProps) {
  return (
    <button
      ref={innerRef}
      type="button"
      className={
        "sel-toolbar__btn" +
        (active ? " sel-toolbar__btn--active" : "") +
        (danger ? " sel-toolbar__btn--danger" : "")
      }
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

type PanelId = "color" | "fill" | "stroke" | "text" | "opacity" | "arrange" | null;

interface Props {
  pageId: string;
}

export function SelectionToolbar({ pageId }: Props) {
  const selection = useToolStore((s) => s.selection);
  const revision = useShapeStore((s) => s.revision);
  const viewport = useViewportStore((s) => s.viewport);
  const viewSize = useViewportStore((s) => s.size);
  const editing = useTextEditStore((s) => s.session !== null);

  const [panel, setPanel] = useState<PanelId>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barSize, setBarSize] = useState({ w: 0, h: 0 });

  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const fillBtnRef = useRef<HTMLButtonElement>(null);
  const strokeBtnRef = useRef<HTMLButtonElement>(null);
  const textBtnRef = useRef<HTMLButtonElement>(null);
  const opacityBtnRef = useRef<HTMLButtonElement>(null);
  const arrangeBtnRef = useRef<HTMLButtonElement>(null);

  const recents = useRecentColors();

  const selected = useMemo(() => {
    const store = useShapeStore.getState();
    return Array.from(selection)
      .map((id) => store.getShape(pageId, id))
      .filter((s): s is YShape => !!s);
    // revision so the toolbar reflects model edits / undo immediately.
  }, [selection, revision, pageId]);

  // Close any open panel when the selection itself changes.
  const selectionKey = useMemo(
    () => Array.from(selection).sort().join(","),
    [selection],
  );
  const prevKeyRef = useRef(selectionKey);
  if (prevKeyRef.current !== selectionKey) {
    prevKeyRef.current = selectionKey;
    if (panel !== null) setPanel(null);
  }

  // World bounds of the selection → screen-space anchor for the bar.
  const bounds = useMemo(() => {
    if (selected.length === 0) return null;
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const s of selected) {
      const b = shapeBounds(s);
      x1 = Math.min(x1, b.x);
      y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.w);
      y2 = Math.max(y2, b.y + b.h);
    }
    return { x1, y1, x2, y2 };
  }, [selected]);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width !== barSize.w || r.height !== barSize.h) {
      setBarSize({ w: r.width, h: r.height });
    }
  });

  if (selected.length === 0 || !bounds || editing) return null;

  const store = useShapeStore.getState();
  const ids = selected.map((s) => s.id);

  // ---- position --------------------------------------------------------
  const sx1 = bounds.x1 * viewport.scale + viewport.x;
  const sy1 = bounds.y1 * viewport.scale + viewport.y;
  const sx2 = bounds.x2 * viewport.scale + viewport.x;
  const sy2 = bounds.y2 * viewport.scale + viewport.y;
  const cx = (sx1 + sx2) / 2;
  let left = cx - barSize.w / 2;
  left = Math.max(EDGE, Math.min(left, viewSize.w - barSize.w - EDGE));
  // Prefer above the selection; flip below when it would collide with the
  // dock or the viewport edge.
  let top = sy1 - GAP - barSize.h;
  let placement: "top" | "bottom" = "top";
  if (top < TOP_SAFE) {
    top = sy2 + GAP;
    placement = "bottom";
  }
  top = Math.max(EDGE, Math.min(top, viewSize.h - barSize.h - EDGE));

  // ---- selection facts ---------------------------------------------------
  function patchEach(make: (s: YShape) => Partial<YShape> | null) {
    store.transact(() => {
      for (const s of selected) {
        const p = make(s);
        if (p) store.updateShape(pageId, s.id, p);
      }
    });
  }

  const isFillKind = (s: YShape) =>
    s.kind === "rect" || s.kind === "ellipse" || s.kind === "polygon";
  const hasColor = selected.some((s) => shapeColor(s) !== undefined);
  const fillShapes = selected.filter(isFillKind);
  const textShapes = selected.filter((s) => s.kind === "text");
  const thicknessShapes = selected.filter((s) => shapeThickness(s) !== undefined);
  const alignTextShapes = selected.filter(
    (s) => s.kind === "text" || s.kind === "sticky",
  );

  const currentColor = shared(selected, shapeColor);
  const currentFill = shared(fillShapes, (s) =>
    isFillKind(s) ? (s as { fill: string | null }).fill : undefined,
  );
  const currentOpacity = shared(selected, (s) => s.opacity ?? 1);
  const currentSize = shared(textShapes, (s) =>
    s.kind === "text" ? s.size : undefined,
  );
  const currentThickness = shared(thicknessShapes, shapeThickness);
  const currentAlign = shared(alignTextShapes, (s) =>
    s.kind === "text"
      ? (s.align ?? "left")
      : s.kind === "sticky"
        ? (s.align ?? "center")
        : undefined,
  );
  const allLocked = shared(selected, (s) => !!s.locked) === true;
  const opacityValue = typeof currentOpacity === "number" ? currentOpacity : 1;

  function pickColor(c: string) {
    patchEach((s) => colorPatch(s, c));
    recordRecentColor(c);
  }

  function duplicate() {
    const offset = 24 / Math.max(0.25, viewport.scale);
    const clones: YShape[] = selected
      .filter((s) => !s.locked)
      .map((s) => ({
        ...translateShape(s, offset, offset),
        id: newShapeId(),
        z: undefined,
      }));
    if (clones.length === 0) return;
    store.transact(() => {
      for (const c of clones) store.addShape(pageId, c);
    });
    useToolStore.getState().setSelection(clones.map((c) => c.id));
  }

  function deleteSelection() {
    const deletable = ids.filter((id) => !store.getShape(pageId, id)?.locked);
    if (deletable.length === 0) return;
    store.transact(() => store.deleteShapes(pageId, deletable));
    useToolStore.getState().clearSelection();
  }

  function toggle(p: PanelId) {
    setPanel((cur) => (cur === p ? null : p));
  }

  const barStyle = { left, top } as const;

  // Locked selections expose exactly one action: Unlock (Freeform behaviour).
  if (allLocked) {
    return (
      <div
        ref={barRef}
        className="sel-toolbar"
        style={barStyle}
        data-placement={placement}
        role="toolbar"
        aria-label="Selection"
      >
        <button
          type="button"
          className="sel-toolbar__unlock"
          onClick={() => patchEach(() => ({ locked: false }))}
        >
          <Icon name="unlock" size={15} />
          <span>Unlock</span>
        </button>
      </div>
    );
  }

  const paletteSet = new Set(COLORS.map((c) => c.toLowerCase()));
  const recentRow = recents.filter((c) => !paletteSet.has(c.toLowerCase()));

  function swatchGrid(
    current: string | "mixed" | null | undefined,
    onPick: (c: string) => void,
    withNone?: boolean,
  ): ReactNode {
    return (
      <div className="sel-toolbar__palette">
        {withNone && (
          <Swatch
            color="none"
            size={24}
            selected={current === null}
            onClick={() => patchEach((s) => (isFillKind(s) ? { fill: null } : null))}
            aria-label="No fill"
          />
        )}
        {COLORS.map((c) => (
          <Swatch
            key={c}
            color={c}
            size={24}
            selected={current === c}
            onClick={() => onPick(c)}
            aria-label={c}
          />
        ))}
        {recentRow.map((c) => (
          <Swatch
            key={`r-${c}`}
            color={c}
            size={24}
            selected={current === c}
            onClick={() => onPick(c)}
            aria-label={c}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={barRef}
        className="sel-toolbar"
        style={barStyle}
        data-placement={placement}
        role="toolbar"
        aria-label="Selection"
      >
        {hasColor && (
          <button
            ref={colorBtnRef}
            type="button"
            className="sel-toolbar__btn"
            onClick={() => toggle("color")}
            title="Color"
            aria-label="Color"
          >
            <span
              className="sel-toolbar__chip"
              style={{
                background:
                  typeof currentColor === "string" ? currentColor : "#888",
              }}
            />
          </button>
        )}

        {fillShapes.length > 0 && (
          <button
            ref={fillBtnRef}
            type="button"
            className="sel-toolbar__btn"
            onClick={() => toggle("fill")}
            title="Fill"
            aria-label="Fill"
          >
            <span
              className={
                "sel-toolbar__chip sel-toolbar__chip--ring" +
                (currentFill == null || currentFill === "mixed"
                  ? " sel-toolbar__chip--none"
                  : "")
              }
              style={
                typeof currentFill === "string"
                  ? { background: currentFill }
                  : undefined
              }
            />
          </button>
        )}

        {thicknessShapes.length > 0 && (
          <BarButton
            innerRef={strokeBtnRef}
            icon="sliders"
            label="Thickness"
            active={panel === "stroke"}
            onClick={() => toggle("stroke")}
          />
        )}

        {alignTextShapes.length > 0 && (
          <BarButton
            innerRef={textBtnRef}
            icon="text"
            label="Text style"
            active={panel === "text"}
            onClick={() => toggle("text")}
          />
        )}

        <BarButton
          innerRef={opacityBtnRef}
          icon="opacity"
          label="Opacity"
          active={panel === "opacity"}
          onClick={() => toggle("opacity")}
        />

        <span className="sel-toolbar__divider" />

        <BarButton icon="duplicate" label="Duplicate" onClick={duplicate} />
        <BarButton
          innerRef={arrangeBtnRef}
          icon="to-front"
          label="Arrange"
          active={panel === "arrange"}
          onClick={() => toggle("arrange")}
        />
        <BarButton
          icon="lock"
          label="Lock"
          onClick={() => patchEach(() => ({ locked: true }))}
        />
        <BarButton icon="trash" label="Delete" danger onClick={deleteSelection} />
      </div>

      {/* Color */}
      <Popover
        open={panel === "color"}
        onClose={() => setPanel(null)}
        anchorRef={colorBtnRef}
        placement="auto"
        tail
      >
        {swatchGrid(currentColor, pickColor)}
      </Popover>

      {/* Fill */}
      <Popover
        open={panel === "fill"}
        onClose={() => setPanel(null)}
        anchorRef={fillBtnRef}
        placement="auto"
        tail
      >
        {swatchGrid(
          currentFill,
          (c) => {
            patchEach((s) => (isFillKind(s) ? { fill: c } : null));
            recordRecentColor(c);
          },
          true,
        )}
      </Popover>

      {/* Thickness */}
      <Popover
        open={panel === "stroke"}
        onClose={() => setPanel(null)}
        anchorRef={strokeBtnRef}
        placement="auto"
        tail
      >
        <div className="sel-toolbar__row">
          {THICKNESS_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              className={
                "sel-toolbar__preset" +
                (currentThickness === t ? " sel-toolbar__preset--active" : "")
              }
              onClick={() => patchEach((s) => thicknessPatch(s, t))}
              aria-label={`Thickness ${t}`}
              aria-pressed={currentThickness === t}
            >
              <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden>
                <line
                  x1={3}
                  y1={11}
                  x2={19}
                  y2={11}
                  stroke="currentColor"
                  strokeWidth={Math.max(1, Math.min(7, t * 0.9))}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ))}
          <input
            className="sel-toolbar__num"
            type="number"
            min={1}
            max={50}
            value={typeof currentThickness === "number" ? currentThickness : ""}
            placeholder={currentThickness === "mixed" ? "—" : ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) {
                patchEach((s) => thicknessPatch(s, n));
              }
            }}
            aria-label="Stroke thickness"
          />
        </div>
      </Popover>

      {/* Text style */}
      <Popover
        open={panel === "text"}
        onClose={() => setPanel(null)}
        anchorRef={textBtnRef}
        placement="auto"
        tail
      >
        <div className="sel-toolbar__stack">
          <div className="sel-toolbar__row">
            {ALIGN_TEXT_OPTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={
                  "sel-toolbar__preset" +
                  (currentAlign === a.id ? " sel-toolbar__preset--active" : "")
                }
                onClick={() =>
                  patchEach((s) =>
                    s.kind === "text" || s.kind === "sticky"
                      ? { align: a.id }
                      : null,
                  )
                }
                title={a.label}
                aria-label={a.label}
                aria-pressed={currentAlign === a.id}
              >
                <Icon name={a.icon} size={16} />
              </button>
            ))}
            {textShapes.length > 0 && (
              <input
                className="sel-toolbar__num"
                type="number"
                min={8}
                value={typeof currentSize === "number" ? currentSize : ""}
                placeholder={currentSize === "mixed" ? "—" : ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) {
                    patchEach((s) => (s.kind === "text" ? { size: n } : null));
                  }
                }}
                aria-label="Font size"
              />
            )}
          </div>
        </div>
      </Popover>

      {/* Opacity */}
      <Popover
        open={panel === "opacity"}
        onClose={() => setPanel(null)}
        anchorRef={opacityBtnRef}
        placement="auto"
        tail
        className="sel-toolbar__opacity-popover"
      >
        <Slider
          value={opacityValue}
          onChange={(v) => patchEach(() => ({ opacity: v }))}
          trackStyle="opacity"
          color={typeof currentColor === "string" ? currentColor : "#1c1c1e"}
          aria-label="Opacity"
        />
      </Popover>

      {/* Arrange: z-order, plus object alignment for multi-selections */}
      <Popover
        open={panel === "arrange"}
        onClose={() => setPanel(null)}
        anchorRef={arrangeBtnRef}
        placement="auto"
        tail
      >
        <div className="sel-toolbar__stack">
          <div className="sel-toolbar__row">
            <BarButton
              icon="to-front"
              label="Bring to front"
              onClick={() => store.bringToFront(pageId, ids)}
            />
            <BarButton
              icon="forward"
              label="Bring forward"
              onClick={() => store.bringForward(pageId, ids)}
            />
            <BarButton
              icon="backward"
              label="Send backward"
              onClick={() => store.sendBackward(pageId, ids)}
            />
            <BarButton
              icon="to-back"
              label="Send to back"
              onClick={() => store.sendToBack(pageId, ids)}
            />
          </div>
          {selected.length >= 2 && (
            <div className="sel-toolbar__row">
              {ALIGN_OBJECT_OPTIONS.map((a) => (
                <BarButton
                  key={a.id}
                  icon={a.icon}
                  label={a.label}
                  onClick={() => alignShapes(store, pageId, ids, a.id)}
                />
              ))}
            </div>
          )}
          {selected.length >= 3 && (
            <div className="sel-toolbar__row">
              <BarButton
                icon="distribute-h"
                label="Distribute horizontally"
                onClick={() => distributeShapes(store, pageId, ids, "h")}
              />
              <BarButton
                icon="distribute-v"
                label="Distribute vertically"
                onClick={() => distributeShapes(store, pageId, ids, "v")}
              />
            </div>
          )}
        </div>
      </Popover>
    </>
  );
}
