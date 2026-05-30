import type { CSSProperties } from "react";

interface Props {
  /** 0..1 */
  value: number;
  onChange(value: number): void;
  /** "opacity" draws a checkerboard + colored gradient track and a value box. */
  trackStyle?: "plain" | "opacity";
  /** The color the opacity gradient fades toward (the active ink color). */
  color?: string;
  /** Show a percentage value box on the right (opacity track). */
  showValue?: boolean;
  "aria-label"?: string;
}

// Knob diameter — must match `.slider__knob` in styles.css. The knob travels
// inside a rail inset by its radius so it stays fully visible at 0% and 100%
// instead of being clipped by the track's rounded `overflow: hidden`.
const KNOB = 26;

/** Generic 0..1 slider; the "opacity" variant draws a translucency track. */
export function Slider({
  value,
  onChange,
  trackStyle = "plain",
  color = "#000000",
  showValue = trackStyle === "opacity",
  ...rest
}: Props) {
  const pct = Math.round(value * 100);
  const clamped = Math.max(0, Math.min(1, value));
  const fill: CSSProperties =
    trackStyle === "opacity"
      ? {
          background: `linear-gradient(90deg, transparent, ${color})`,
        }
      : {
          background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--field-bg) ${pct}%)`,
        };

  return (
    <div className="slider">
      <div className="slider__rail">
        <div
          className={
            "slider__track" +
            (trackStyle === "opacity" ? " slider__track--checker" : "")
          }
        >
          <div className="slider__fill" style={fill} />
          <input
            className="slider__input"
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            aria-label={rest["aria-label"]}
          />
        </div>
        <div
          className="slider__knob"
          style={{ left: `calc(${KNOB / 2}px + (100% - ${KNOB}px) * ${clamped})` }}
        />
      </div>
      {showValue && <div className="slider__value">{pct}%</div>}
    </div>
  );
}
