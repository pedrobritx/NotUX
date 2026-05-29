import { useMemo, useState, type RefObject } from "react";
import { Segmented, Sheet, Slider, Swatch } from "@notux/ui";
import { useDockStore } from "@notux/canvas";
import { useSavedSwatches } from "./useSavedSwatches";

interface Props {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement>;
}

interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> };
}

// ---- color helpers -------------------------------------------------------

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => clamp255(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

const COLS = 12;
const COLOR_ROWS = 10;

// iOS-style matrix: a grayscale top row, then hue columns over shade rows.
function buildColorGrid(): string[] {
  const out: string[] = [];
  for (let c = 0; c < COLS; c++) {
    out.push(hslToHex(0, 0, 1 - c / (COLS - 1)));
  }
  for (let r = 0; r < COLOR_ROWS; r++) {
    const l = (22 + (r * (88 - 22)) / (COLOR_ROWS - 1)) / 100;
    for (let c = 0; c < COLS; c++) {
      const h = (210 + c * 30) % 360;
      out.push(hslToHex(h, 0.85, l));
    }
  }
  return out;
}

// ---- component -----------------------------------------------------------

export function ColorPicker({ open, onClose, anchorRef }: Props) {
  const color = useDockStore((s) => s.instruments[s.activeInstrumentId].color);
  const opacity = useDockStore(
    (s) => s.instruments[s.activeInstrumentId].opacity,
  );
  const setColor = useDockStore((s) => s.setActiveColor);
  const setOpacity = useDockStore((s) => s.setActiveOpacity);
  const { swatches, addSwatch } = useSavedSwatches();
  const [tab, setTab] = useState<"Grid" | "Sliders">("Grid");

  const grid = useMemo(buildColorGrid, []);
  const rgb = useMemo(() => hexToRgb(color), [color]);
  const lower = color.toLowerCase();

  const hasEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in window;

  async function pickFromScreen() {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor })
      .EyeDropper;
    if (!Ctor) return;
    try {
      const res = await new Ctor().open();
      setColor(res.sRGBHex);
    } catch {
      /* user dismissed the eyedropper */
    }
  }

  return (
    <Sheet open={open} onClose={onClose} anchorRef={anchorRef}>
      <div className="color-picker">
        <div className="color-picker__header">
          {hasEyeDropper ? (
            <button
              type="button"
              className="color-picker__icon-btn color-picker__icon-btn--eyedropper"
              onClick={pickFromScreen}
              aria-label="Pick color from screen"
              title="Pick color from screen"
            >
              ⊙
            </button>
          ) : (
            <span />
          )}
          <div className="color-picker__title">Colors</div>
          <button
            type="button"
            className="color-picker__icon-btn"
            onClick={onClose}
            aria-label="Close color picker"
          >
            ✕
          </button>
        </div>

        <Segmented<"Grid" | "Sliders">
          options={["Grid", "Sliders"]}
          value={tab}
          onChange={setTab}
        />

        {tab === "Grid" ? (
          <div className="color-grid">
            {grid.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                className={
                  "color-grid__cell" +
                  (c.toLowerCase() === lower
                    ? " color-grid__cell--selected"
                    : "")
                }
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        ) : (
          <div className="color-sliders">
            {(["r", "g", "b"] as const).map((ch) => (
              <div className="color-sliders__row" key={ch}>
                <span className="color-sliders__label">{ch.toUpperCase()}</span>
                <input
                  className="color-sliders__channel"
                  type="range"
                  min={0}
                  max={255}
                  value={rgb[ch]}
                  onChange={(e) =>
                    setColor(toHex(
                      ch === "r" ? Number(e.target.value) : rgb.r,
                      ch === "g" ? Number(e.target.value) : rgb.g,
                      ch === "b" ? Number(e.target.value) : rgb.b,
                    ))
                  }
                  aria-label={`${ch.toUpperCase()} channel`}
                />
              </div>
            ))}
            <div className="color-sliders__row">
              <span className="color-sliders__label">#</span>
              <input
                className="color-sliders__hex"
                value={color.replace(/^#/, "")}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#?[0-9a-f]{6}$/i.test(v)) {
                    setColor(v.startsWith("#") ? v : `#${v}`);
                  }
                }}
                aria-label="Hex color"
                spellCheck={false}
                maxLength={7}
              />
            </div>
          </div>
        )}

        <div className="color-picker__section-label">Opacity</div>
        <Slider
          value={opacity}
          onChange={setOpacity}
          trackStyle="opacity"
          color={color}
          aria-label="Opacity"
        />

        <div className="color-picker__swatches">
          <div
            className="color-picker__current"
            style={{ background: color }}
            aria-label={`Current color ${color}`}
          />
          <div className="color-picker__saved">
            {swatches.map((c) => (
              <Swatch
                key={c}
                color={c}
                size={30}
                selected={c.toLowerCase() === lower}
                onClick={() => setColor(c)}
              />
            ))}
            <button
              type="button"
              className="color-picker__icon-btn"
              onClick={() => addSwatch(color)}
              aria-label="Save current color"
              title="Save current color"
            >
              ＋
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
