import { useState, type RefObject } from "react";
import { ColorField, Icon, Sheet, Slider, Swatch } from "@notux/ui";
import { useDockStore } from "@notux/canvas";
import { useSavedSwatches } from "./useSavedSwatches";
import { recordRecentColor, useRecentColors } from "./useRecentColors";
import { COLORS } from "./palette";

interface Props {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement>;
}

interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> };
}

// Simple by default: the curated palette, recents and saved swatches are all
// one tap away. The full HSV field (any color) lives behind a "Custom"
// disclosure so the common case stays calm and uncluttered.

export function ColorPicker({ open, onClose, anchorRef }: Props) {
  const color = useDockStore((s) => s.instruments[s.activeInstrumentId].color);
  const opacity = useDockStore(
    (s) => s.instruments[s.activeInstrumentId].opacity,
  );
  const setColor = useDockStore((s) => s.setActiveColor);
  const setOpacity = useDockStore((s) => s.setActiveOpacity);
  const { swatches, addSwatch } = useSavedSwatches();
  const recents = useRecentColors();
  const [customOpen, setCustomOpen] = useState(false);

  const lower = color.toLowerCase();

  // Discrete choices (palette/recent/saved taps) set the color and record it.
  function pick(c: string) {
    setColor(c);
    recordRecentColor(c);
  }

  // Record the settled color into recents when the picker closes, so a single
  // drag through the HSV field leaves one recent entry, not dozens.
  function handleClose() {
    recordRecentColor(color);
    onClose();
  }

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  async function pickFromScreen() {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor })
      .EyeDropper;
    if (!Ctor) return;
    try {
      const res = await new Ctor().open();
      pick(res.sRGBHex);
    } catch {
      /* user dismissed the eyedropper */
    }
  }

  // Avoid echoing palette rows: recents that aren't already visible above.
  const paletteSet = new Set(COLORS.map((c) => c.toLowerCase()));
  const recentRow = recents.filter((c) => !paletteSet.has(c.toLowerCase()));

  return (
    <Sheet open={open} onClose={handleClose} anchorRef={anchorRef}>
      <div className="color-picker color-picker--mini">
        <div className="color-picker__header">
          <span className="color-picker__swatch-lg" style={{ background: color }} />
          <div className="color-picker__title">Color</div>
          <button
            type="button"
            className="color-picker__icon-btn"
            onClick={handleClose}
            aria-label="Close color picker"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Quick layer — curated palette */}
        <div className="color-palette-mini">
          {COLORS.map((c) => (
            <Swatch
              key={c}
              color={c}
              size={28}
              selected={c.toLowerCase() === lower}
              onClick={() => pick(c)}
              aria-label={c}
            />
          ))}
        </div>

        {recentRow.length > 0 && (
          <div className="color-palette-mini color-palette-mini--start">
            {recentRow.map((c) => (
              <Swatch
                key={c}
                color={c}
                size={24}
                selected={c.toLowerCase() === lower}
                onClick={() => pick(c)}
                aria-label={c}
              />
            ))}
          </div>
        )}

        {swatches.length > 0 && (
          <div className="color-palette-mini color-palette-mini--start">
            {swatches.map((c) => (
              <Swatch
                key={c}
                color={c}
                size={24}
                selected={c.toLowerCase() === lower}
                onClick={() => pick(c)}
              />
            ))}
          </div>
        )}

        {/* Opacity — always useful (highlighter, fills). */}
        <Slider
          value={opacity}
          onChange={setOpacity}
          trackStyle="opacity"
          color={color}
          aria-label="Opacity"
        />

        {/* Custom disclosure — the full HSV picker, hidden until asked for. */}
        <button
          type="button"
          className="color-picker__more"
          onClick={() => setCustomOpen((v) => !v)}
          aria-expanded={customOpen}
        >
          <Icon name={customOpen ? "chevron-up" : "chevron-down"} size={13} />
          <span>{customOpen ? "Hide custom color" : "Custom color"}</span>
        </button>

        {customOpen && (
          <div className="color-picker__advanced">
            <ColorField value={color} onChange={setColor} />
            <div className="color-picker__custom-actions">
              {hasEyeDropper && (
                <button
                  type="button"
                  className="color-picker__save-btn"
                  onClick={pickFromScreen}
                  aria-label="Pick color from screen"
                >
                  <Icon name="eyedropper" size={14} />
                  <span>Screen</span>
                </button>
              )}
              <button
                type="button"
                className="color-picker__save-btn"
                onClick={() => addSwatch(color)}
                aria-label="Save current color"
              >
                <Icon name="plus" size={14} />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
