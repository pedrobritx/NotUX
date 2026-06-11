import { useMemo } from "react";
import type { TextAlign, YShape } from "@notux/types";
import { Icon, type IconName } from "@notux/ui";
import { useShapeStore, useToolStore } from "@notux/canvas";
import { COLORS } from "./palette";

const ALIGN_OPTIONS: Array<{ id: TextAlign; icon: IconName; label: string }> = [
  { id: "left", icon: "align-left", label: "Align left" },
  { id: "center", icon: "align-center", label: "Align center" },
  { id: "right", icon: "align-right", label: "Align right" },
];

interface Props {
  pageId: string;
}

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

export function SelectionInspector({ pageId }: Props) {
  const selection = useToolStore((s) => s.selection);
  const revision = useShapeStore((s) => s.revision);

  const selected = useMemo(() => {
    const store = useShapeStore.getState();
    return Array.from(selection)
      .map((id) => store.getShape(pageId, id))
      .filter((s): s is YShape => !!s);
    // revision so the panel reflects model edits / undo immediately.
  }, [selection, revision, pageId]);

  if (selected.length === 0) return null;

  const store = useShapeStore.getState();
  const ids = selected.map((s) => s.id);

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
  const alignShapes = selected.filter(
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
  const currentAlign = shared(alignShapes, (s) =>
    s.kind === "text"
      ? (s.align ?? "left")
      : s.kind === "sticky"
        ? (s.align ?? "center")
        : undefined,
  );
  const allLocked = shared(selected, (s) => !!s.locked) === true;

  const opacityValue =
    typeof currentOpacity === "number" ? Math.round(currentOpacity * 100) : 100;

  return (
    <div
      className="selection-inspector"
      role="region"
      aria-label="Selection properties"
    >
      {hasColor && (
        <div className="selection-inspector__row selection-inspector__row--swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={
                "tool-palette__swatch" +
                (currentColor === c ? " tool-palette__swatch--active" : "")
              }
              style={{ background: c }}
              onClick={() => patchEach((s) => colorPatch(s, c))}
              title={c}
              aria-label={`Stroke ${c}`}
            />
          ))}
        </div>
      )}

      {fillShapes.length > 0 && (
        <div className="selection-inspector__row">
          <span className="selection-inspector__label">Fill</span>
          <div className="selection-inspector__swatches">
            <button
              type="button"
              className={
                "tool-palette__swatch selection-inspector__none" +
                (currentFill === null ? " tool-palette__swatch--active" : "")
              }
              onClick={() =>
                patchEach((s) => (isFillKind(s) ? { fill: null } : null))
              }
              title="No fill"
              aria-label="No fill"
            />
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={
                  "tool-palette__swatch" +
                  (currentFill === c ? " tool-palette__swatch--active" : "")
                }
                style={{ background: c }}
                onClick={() =>
                  patchEach((s) => (isFillKind(s) ? { fill: c } : null))
                }
                title={c}
                aria-label={`Fill ${c}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="selection-inspector__row">
        <span className="selection-inspector__label">Opacity</span>
        <input
          className="selection-inspector__range"
          type="range"
          min={0}
          max={100}
          value={opacityValue}
          onChange={(e) =>
            patchEach(() => ({ opacity: Number(e.target.value) / 100 }))
          }
          aria-label="Opacity"
        />
      </div>

      {alignShapes.length > 0 && (
        <div className="selection-inspector__row">
          <span className="selection-inspector__label">Align</span>
          <div className="selection-inspector__seg">
            {ALIGN_OPTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={
                  "selection-inspector__btn" +
                  (currentAlign === a.id ? " selection-inspector__btn--active" : "")
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
                <Icon name={a.icon} size={15} />
              </button>
            ))}
          </div>
        </div>
      )}

      {textShapes.length > 0 && (
        <div className="selection-inspector__row">
          <span className="selection-inspector__label">Size</span>
          <input
            className="selection-inspector__num"
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
        </div>
      )}

      <div className="selection-inspector__row selection-inspector__actions">
        <button
          type="button"
          className="selection-inspector__btn"
          onClick={() => store.bringToFront(pageId, ids)}
          title="Bring to front"
          aria-label="Bring to front"
        >
          ⤒
        </button>
        <button
          type="button"
          className="selection-inspector__btn"
          onClick={() => store.bringForward(pageId, ids)}
          title="Bring forward"
          aria-label="Bring forward"
        >
          ↑
        </button>
        <button
          type="button"
          className="selection-inspector__btn"
          onClick={() => store.sendBackward(pageId, ids)}
          title="Send backward"
          aria-label="Send backward"
        >
          ↓
        </button>
        <button
          type="button"
          className="selection-inspector__btn"
          onClick={() => store.sendToBack(pageId, ids)}
          title="Send to back"
          aria-label="Send to back"
        >
          ⤓
        </button>
      </div>

      <button
        type="button"
        className={
          "selection-inspector__lock" +
          (allLocked ? " selection-inspector__lock--on" : "")
        }
        onClick={() => patchEach(() => ({ locked: !allLocked }))}
      >
        {allLocked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}
