import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clamp,
  hsvToHex,
  hueHex,
  parseHex,
  rgbToHsv,
  type HSV,
} from "./color";

interface Props {
  /** Current color as a "#rrggbb" string. */
  value: string;
  /** Fires with a normalized "#rrggbb" on every change (live, per frame). */
  onChange(hex: string): void;
  /**
   * Fires once at the end of a gesture (drag release, hue release, hex blur)
   * with the settled color. Use this to record history/recents so a single
   * drag doesn't flood them with intermediate values.
   */
  onCommit?(hex: string): void;
  className?: string;
}

const BLACK: HSV = { h: 0, s: 0, v: 0 };

/**
 * A proper HSV color picker: a draggable saturation/value square plus a hue
 * slider and a validated hex field. Hue is kept in local state so that dragging
 * through grays/blacks (where hue is mathematically undefined) doesn't reset the
 * user's chosen hue — the common failure of naive pickers.
 */
export function ColorField({ value, onChange, onCommit, className }: Props) {
  const [hsv, setHsv] = useState<HSV>(
    () => rgbToHsv(parseHex(value) ?? { r: 0, g: 0, b: 0 }),
  );
  // The last hex we emitted, so an echo of our own onChange doesn't clobber the
  // live hue while the user drags in an achromatic region.
  const lastEmit = useRef<string>(value.toLowerCase());
  const [hexDraft, setHexDraft] = useState(value.replace(/^#/, ""));

  const commit = useCallback(() => {
    onCommit?.(lastEmit.current);
  }, [onCommit]);

  // Sync from an external value change (swatch click, recents, etc.).
  useEffect(() => {
    if (value.toLowerCase() === lastEmit.current) return;
    const rgb = parseHex(value);
    if (!rgb) return;
    lastEmit.current = value.toLowerCase();
    setHexDraft(value.replace(/^#/, ""));
    setHsv((prev) => {
      const next = rgbToHsv(rgb);
      // Preserve hue when the incoming color is grayscale (hue is undefined).
      return next.s === 0 ? { ...next, h: prev.h } : next;
    });
  }, [value]);

  const emit = useCallback(
    (next: HSV) => {
      setHsv(next);
      const hex = hsvToHex(next);
      lastEmit.current = hex.toLowerCase();
      setHexDraft(hex.replace(/^#/, ""));
      onChange(hex);
    },
    [onChange],
  );

  // ----- Saturation / Value square --------------------------------------
  const svRef = useRef<HTMLDivElement>(null);
  const svDragging = useRef(false);

  const updateSV = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp((clientX - rect.left) / rect.width, 0, 1);
      const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
      emit({ h: hsv.h, s, v });
    },
    [emit, hsv.h],
  );

  function onSVPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    svDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSV(e.clientX, e.clientY);
  }
  function onSVPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!svDragging.current) return;
    updateSV(e.clientX, e.clientY);
  }
  function endSVDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!svDragging.current) return;
    svDragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    commit();
  }

  function onSVKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.1 : 0.02;
    let { s, v } = hsv;
    if (e.key === "ArrowLeft") s -= step;
    else if (e.key === "ArrowRight") s += step;
    else if (e.key === "ArrowUp") v += step;
    else if (e.key === "ArrowDown") v -= step;
    else return;
    e.preventDefault();
    emit({ h: hsv.h, s: clamp(s, 0, 1), v: clamp(v, 0, 1) });
  }

  // Committing hue on release/blur (not per frame) keeps recents free of the
  // intermediate colors a single slide passes through.
  function onHueKeyUp() {
    commit();
  }

  const base = hueHex(hsv.h);
  const thumbHex = hsvToHex(hsv);

  return (
    <div className={"color-field" + (className ? ` ${className}` : "")}>
      <div
        ref={svRef}
        className="color-field__sv"
        style={{ background: base }}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onPointerDown={onSVPointerDown}
        onPointerMove={onSVPointerMove}
        onPointerUp={endSVDrag}
        onPointerCancel={endSVDrag}
        onKeyDown={onSVKeyDown}
      >
        <div className="color-field__sv-white" />
        <div className="color-field__sv-black" />
        <div
          className="color-field__sv-thumb"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: thumbHex,
          }}
        />
      </div>

      <div className="color-field__hue-row">
        <span
          className="color-field__preview"
          style={{ background: thumbHex }}
          aria-hidden
        />
        <input
          className="color-field__hue"
          type="range"
          min={0}
          max={360}
          value={Math.round(hsv.h)}
          onChange={(e) => emit({ ...hsv, h: Number(e.target.value) })}
          onPointerUp={commit}
          onKeyUp={onHueKeyUp}
          aria-label="Hue"
        />
      </div>

      <div className="color-field__hex-row">
        <span className="color-field__hex-hash">#</span>
        <input
          className="color-field__hex"
          value={hexDraft}
          spellCheck={false}
          maxLength={6}
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Hex color"
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "");
            setHexDraft(raw);
            const rgb = parseHex(raw);
            if (rgb) {
              const next = rgbToHsv(rgb);
              emit(next.s === 0 ? { ...next, h: hsv.h } : next);
            }
          }}
          onBlur={() => {
            setHexDraft(hsvToHex(hsv).replace(/^#/, ""));
            commit();
          }}
        />
      </div>
    </div>
  );
}
