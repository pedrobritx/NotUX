import type { IconName } from "./Icon";

// SF Symbol artwork (vector SVGs, black-on-transparent) rendered via CSS mask
// so glyphs tint with `currentColor` in either theme and stay crisp at any
// size. Names without an entry here fall back to the hand-drawn stroke SVGs
// in Icon.tsx.
const u = (file: string) =>
  new URL(`./assets/${file}.svg`, import.meta.url).href;

export const SF_ICON_URLS: Partial<Record<IconName, string>> = {
  // Dock tools
  select: u("pointer.arrow.ipad"),
  hand: u("hand.point.up"),
  pen: u("pencil.line"),
  eraser: u("eraser"),
  highlighter: u("highlighter"),
  text: u("textformat"),
  media: u("photo.on.rectangle"),
  shapes: u("square.on.circle"),

  // Chrome / navigation
  plus: u("plus"),
  minus: u("minus"),
  "chevron-down": u("chevron.down"),
  "chevron-up": u("chevron.up"),
  "chevron-left": u("chevron.left"),
  "chevron-right": u("chevron.right"),
  menu: u("text.justify"),
  close: u("xmark"),
  check: u("checkmark"),
  ellipsis: u("ellipsis"),
  search: u("magnifyingglass"),
  star: u("star"),
  clock: u("clock"),
  archive: u("archivebox"),
  rename: u("pencil"),
  board: u("rectangle.on.rectangle"),
  duplicate: u("square.on.square"),
  sliders: u("slider.horizontal.3"),
  opacity: u("circle.lefthalf.filled"),

  // Edit / view
  undo: u("arrow.counterclockwise"),
  redo: u("arrow.clockwise"),
  "zoom-in": u("plus"),
  "zoom-out": u("minus"),
  "zoom-reset": u("viewfinder"),
  history: u("clock.arrow.trianglehead.clockwise.rotate.90.path.dotted"),
  trash: u("trash"),
  lock: u("lock"),
  unlock: u("lock.open"),
  sun: u("sun.max"),
  moon: u("moon"),
  cursors: u("inset.filled.rectangle.and.pointer.arrow"),
  background: u("swatchpalette"),

  // Arrange (z-order)
  "to-front": u("square.3.layers.3d.top.filled"),
  forward: u("square.stack.3d.up"),
  backward: u("square.3.layers.3d.middle.filled"),
  "to-back": u("square.3.layers.3d.bottom.filled"),

  // Object alignment / distribution
  "obj-align-left": u("align.horizontal.left"),
  "obj-align-center": u("align.horizontal.center"),
  "obj-align-right": u("align.horizontal.right"),
  "obj-align-top": u("align.vertical.top"),
  "obj-align-middle": u("align.vertical.center"),
  "obj-align-bottom": u("align.vertical.bottom"),
  "distribute-h": u("distribute.horizontal"),
  "distribute-v": u("distribute.vertical"),

  // Transfer / files
  upload: u("square.and.arrow.up"),
  download: u("square.and.arrow.down"),
  share: u("square.and.arrow.up"),
  link: u("link"),
  pages: u("book.pages"),
  photo: u("photo"),
  audio: u("speaker.wave.2"),
  file: u("text.document"),
  video: u("play.display"),
  folder: u("folder"),
  eyedropper: u("eyedropper"),

  // Collaboration
  spotlight: u("megaphone"),
  people: u("person.2"),

  // Shape library
  square: u("square"),
  rounded: u("app"),
  circle: u("circle"),
  diamond: u("diamond"),
  triangle: u("triangle"),
  line: u("line.diagonal"),
  arrow: u("arrow.up.right"),
  "arrow-curved": u("point.bottomleft.forward.to.point.topright.scurvepath"),
  "arrow-elbow": u("arrow.turn.right.up"),

  // Text alignment
  "align-left": u("text.alignleft"),
  "align-center": u("text.aligncenter"),
  "align-right": u("text.alignright"),

  // Canvas grid styles
  "grid-dots": u("circle.grid.3x3"),
  "grid-lines": u("grid"),
  "grid-ruled": u("line.3.horizontal"),
  "grid-plain": u("rectangle"),
};

// Optional per-glyph mask scale. The SVG assets are normalized onto a shared
// square canvas (see assets), so glyphs already sit at consistent optical
// weight; entries here are only for deliberate one-off corrections.
export const SF_ICON_SCALE: Partial<Record<IconName, number>> = {};
