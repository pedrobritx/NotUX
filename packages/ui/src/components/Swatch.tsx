import type { CSSProperties } from "react";

interface Props {
  /** A CSS color, or "none" for the diagonal no-fill chip. */
  color: string;
  selected?: boolean;
  /** Rainbow ring with the color in the center (the dock's color button). */
  rainbow?: boolean;
  size?: number;
  onClick?(): void;
  title?: string;
  "aria-label"?: string;
  className?: string;
}

/** Round color tile used in palettes, saved-swatch rows and the dock. */
export function Swatch({
  color,
  selected,
  rainbow,
  size = 24,
  onClick,
  title,
  className,
  ...rest
}: Props) {
  const cls =
    "swatch" +
    (rainbow ? " swatch--rainbow" : "") +
    (color === "none" ? " swatch--none" : "") +
    (selected ? " swatch--selected" : "") +
    (className ? ` ${className}` : "");
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(rainbow
      ? ({ ["--swatch-color" as string]: color } as CSSProperties)
      : color === "none"
        ? {}
        : { background: color }),
  };
  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={onClick}
      title={title ?? (color === "none" ? "No fill" : color)}
      aria-label={rest["aria-label"] ?? title ?? color}
      aria-pressed={selected}
    />
  );
}
