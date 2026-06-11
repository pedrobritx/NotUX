import type { BackgroundPresetId } from "@notux/sync";

// Paper colors for the board background. Each preset pairs a light and a dark
// variant so a sand board stays sand-toned for users in dark mode, and the
// effective color (not the UI theme) drives ink/grid contrast.
export const BACKGROUND_PRESETS: Record<
  BackgroundPresetId,
  { label: string; light: string; dark: string }
> = {
  default: { label: "Default", light: "#ffffff", dark: "#0e1218" },
  sand: { label: "Paper Sand", light: "#f3ead9", dark: "#262019" },
  grey: { label: "Grey", light: "#e9eaee", dark: "#23262b" },
  blue: { label: "Light Blue", light: "#e4eefb", dark: "#16202e" },
  green: { label: "Light Green", light: "#e6f2e6", dark: "#1a261c" },
};

export function effectiveBackground(
  id: BackgroundPresetId,
  theme: "light" | "dark",
): string {
  const preset = BACKGROUND_PRESETS[id] ?? BACKGROUND_PRESETS.default;
  return theme === "dark" ? preset.dark : preset.light;
}

/** Relative luminance (0..1) of a #rrggbb color. */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return 0.5;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * lin((n >> 16) & 0xff) +
    0.7152 * lin((n >> 8) & 0xff) +
    0.0722 * lin(n & 0xff)
  );
}

export function isDarkBackground(hex: string): boolean {
  return relativeLuminance(hex) < 0.5;
}

/** Grid/dot color with readable-but-quiet contrast against the paper. */
export function gridColorFor(bg: string): string {
  return isDarkBackground(bg)
    ? "rgba(255, 255, 255, 0.10)"
    : "rgba(20, 22, 28, 0.12)";
}
