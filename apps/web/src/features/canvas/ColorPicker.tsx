import { useMemo, type RefObject } from "react";
import { Icon, Sheet, Slider, Swatch } from "@notux/ui";
import { useDockStore } from "@notux/canvas";
import { useSavedSwatches } from "./useSavedSwatches";
import { COLORS } from "./palette";

interface Props {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement>;
}

interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> };
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
            onClick={onClose}
            aria-label="Close color picker"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Minimalist swatch palette */}
        <div className="color-palette-mini">
          {COLORS.map((c) => (
            <Swatch
              key={c}
              color={c}
              size={26}
              selected={c.toLowerCase() === lower}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>

        {/* Hex input */}
        <div className="color-picker__hex-row">
          <span className="color-picker__hex-label">#</span>
          <input
            className="color-picker__hex-input"
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
          <div
            className="color-picker__preview"
            style={{ background: color }}
          />
        </div>

        <div className="color-picker__section-label">Opacity</div>
        <Slider
          value={opacity}
          onChange={setOpacity}
          trackStyle="opacity"
          color={color}
          aria-label="Opacity"
        />

        {swatches.length > 0 && (
          <div className="color-picker__swatches">
            <div className="color-picker__saved">
              {swatches.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  size={26}
                  selected={c.toLowerCase() === lower}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        )}

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
    </Sheet>
  );
}
