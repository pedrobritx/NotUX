export const UI_PACKAGE_VERSION = "0.0.0";

export { useTheme, applyTheme, getInitialTheme } from "./theme/useTheme";
export type { Theme, UseThemeResult } from "./theme/useTheme";

export { GlassPanel } from "./components/GlassPanel";
export { GlassButton } from "./components/GlassButton";
export { Popover } from "./components/Popover";
export { Sheet } from "./components/Sheet";
export { Segmented } from "./components/Segmented";
export { Slider } from "./components/Slider";
export { Swatch } from "./components/Swatch";
export { ColorField } from "./components/ColorField";
export {
  parseHex,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hsvToHex,
  hueHex,
  clamp,
} from "./components/color";
export type { RGB, HSV } from "./components/color";

export { Instrument, INSTRUMENT_KINDS } from "./instruments/Instrument";
export type { InstrumentKind } from "./instruments/Instrument";

export { Icon } from "./icons/Icon";
export type { IconName } from "./icons/Icon";
