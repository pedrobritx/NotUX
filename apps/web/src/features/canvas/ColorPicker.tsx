import { type RefObject } from "react";
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

// The picker leads with a proper HSV field (saturation/value square + hue), so
// any color is reachable directly. Curated palette, recents and saved swatches
// sit below as one-tap shortcuts; opacity and save round it out.

export function ColorPicker({ open, onClose, anchorRef }: Props) {
  const color = useDockStore((s) => s.instruments[s.activeInstrumentId].color);
  const opacity = useDockStore(
    (s) => s.instruments[s.activeInstrumentId].opacity,
  );
  const setColor = useDockStore((s) => s.setActiveColor);
  const setOpacity = useDockStore((s) => s.setActiveOpacity);
  const { swatches, addSwatch } = useSavedSwatches();
  const recents = useRecentColors();

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

  const hasEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in window;

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
          {hasEyeDropper ? (
            <button
              type="button"
              className="color-picker__icon-btn color-picker__icon-btn--eyedropper"
              onClick={pickFromScreen}
              aria-label="Pick color from screen"
              title="Pick color from screen"
            >
              <Icon name="eyedropper" size={18} />
            </button>
          ) : (
            <span />
          )}
          <div className="color-picker__title">Colors</div>
          <button
            type="button"
            className="color-picker__icon-btn"
            onClick={handleClose}
            aria-label="Close color picker"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Real HSV picker — any color is one drag away. Updates live; the
            settled color is recorded into recents on close (see handleClose). */}
        <ColorField value={color} onChange={setColor} />

        {/* Quick layer — curated palette */}
        <div className="color-palette-mini">
          {COLORS.map((c) => (
            <Swatch
              key={c}
              color={c}
              size={26}
              selected={c.toLowerCase() === lower}
              onClick={() => pick(c)}
              aria-label={c}
            />
          ))}
        </div>

        {recentRow.length > 0 && (
          <>
            <div className="color-picker__section-label">Recent</div>
            <div className="color-palette-mini">
              {recentRow.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  size={26}
                  selected={c.toLowerCase() === lower}
                  onClick={() => pick(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </>
        )}

        {swatches.length > 0 && (
          <>
            <div className="color-picker__section-label">Saved</div>
            <div className="color-palette-mini">
              {swatches.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  size={26}
                  selected={c.toLowerCase() === lower}
                  onClick={() => pick(c)}
                />
              ))}
            </div>
          </>
        )}

        <div className="color-picker__advanced">
          <div className="color-picker__section-label">Opacity</div>
          <Slider
            value={opacity}
            onChange={setOpacity}
            trackStyle="opacity"
            color={color}
            aria-label="Opacity"
          />

          <button
            type="button"
            className="color-picker__save-btn"
            onClick={() => addSwatch(color)}
            aria-label="Save current color"
            title="Save current color"
          >
            <Icon name="plus" size={14} />
            <span>Save color</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
}
