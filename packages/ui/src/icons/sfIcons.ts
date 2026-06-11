import type { IconName } from "./Icon";

// SF Symbol artwork (monochrome @2x PNGs, black-on-transparent) rendered via
// CSS mask so glyphs tint with `currentColor` in either theme. Names without
// an entry here fall back to the hand-drawn stroke SVGs in Icon.tsx.
export const SF_ICON_URLS: Partial<Record<IconName, string>> = {
  // Dock tools
  select: new URL("./assets/pointer.arrow.ipad@2x.png", import.meta.url).href,
  hand: new URL("./assets/hand.point.up@2x.png", import.meta.url).href,
  pen: new URL("./assets/pencil.line@2x.png", import.meta.url).href,
  eraser: new URL("./assets/eraser@2x.png", import.meta.url).href,
  highlighter: new URL("./assets/highlighter@2x.png", import.meta.url).href,
  text: new URL("./assets/textformat@2x.png", import.meta.url).href,
  media: new URL("./assets/photo.on.rectangle@2x.png", import.meta.url).href,

  // Chrome / navigation
  plus: new URL("./assets/plus@2x.png", import.meta.url).href,
  minus: new URL("./assets/minus@2x.png", import.meta.url).href,
  "chevron-down": new URL("./assets/chevron.down@2x.png", import.meta.url).href,
  "chevron-up": new URL("./assets/chevron.up@2x.png", import.meta.url).href,
  "chevron-left": new URL("./assets/chevron.left@2x.png", import.meta.url).href,
  "chevron-right": new URL("./assets/chevron.right@2x.png", import.meta.url)
    .href,
  menu: new URL("./assets/text.justify@2x.png", import.meta.url).href,
  close: new URL("./assets/xmark@2x.png", import.meta.url).href,
  check: new URL("./assets/checkmark@2x.png", import.meta.url).href,

  // Edit / view
  undo: new URL("./assets/arrow.counterclockwise@2x.png", import.meta.url)
    .href,
  redo: new URL("./assets/arrow.clockwise@2x.png", import.meta.url).href,
  "zoom-in": new URL("./assets/plus@2x.png", import.meta.url).href,
  "zoom-out": new URL("./assets/minus@2x.png", import.meta.url).href,
  "zoom-reset": new URL("./assets/viewfinder@2x.png", import.meta.url).href,
  history: new URL(
    "./assets/clock.arrow.trianglehead.clockwise.rotate.90.path.dotted@2x.png",
    import.meta.url,
  ).href,
  trash: new URL("./assets/trash@2x.png", import.meta.url).href,
  lock: new URL("./assets/lock@2x.png", import.meta.url).href,
  unlock: new URL("./assets/lock.open@2x.png", import.meta.url).href,
  sun: new URL("./assets/sun.max@2x.png", import.meta.url).href,
  moon: new URL("./assets/moon@2x.png", import.meta.url).href,
  cursors: new URL(
    "./assets/inset.filled.rectangle.and.pointer.arrow@2x.png",
    import.meta.url,
  ).href,
  background: new URL("./assets/swatchpalette@2x.png", import.meta.url).href,

  // Arrange (z-order)
  "to-front": new URL(
    "./assets/square.3.layers.3d.top.filled@2x.png",
    import.meta.url,
  ).href,
  forward: new URL("./assets/square.stack.3d.up@2x.png", import.meta.url).href,
  backward: new URL(
    "./assets/square.3.layers.3d.middle.filled@2x.png",
    import.meta.url,
  ).href,
  "to-back": new URL(
    "./assets/square.3.layers.3d.bottom.filled@2x.png",
    import.meta.url,
  ).href,

  // Transfer / files
  upload: new URL("./assets/square.and.arrow.up@2x.png", import.meta.url).href,
  download: new URL("./assets/square.and.arrow.down@2x.png", import.meta.url)
    .href,
  share: new URL("./assets/square.and.arrow.up@2x.png", import.meta.url).href,
  link: new URL("./assets/link@2x.png", import.meta.url).href,
  pages: new URL("./assets/book.pages@2x.png", import.meta.url).href,
  photo: new URL("./assets/photo@2x.png", import.meta.url).href,
  audio: new URL("./assets/speaker.wave.2@2x.png", import.meta.url).href,
  file: new URL("./assets/text.document@2x.png", import.meta.url).href,
  video: new URL("./assets/play.display@2x.png", import.meta.url).href,
  folder: new URL("./assets/folder@2x.png", import.meta.url).href,
  eyedropper: new URL("./assets/eyedropper@2x.png", import.meta.url).href,

  // Collaboration
  spotlight: new URL("./assets/megaphone@2x.png", import.meta.url).href,
  people: new URL("./assets/person.3.sequence@2x.png", import.meta.url).href,

  // Shapes
  square: new URL("./assets/square@2x.png", import.meta.url).href,
  circle: new URL("./assets/circle@2x.png", import.meta.url).href,
  diamond: new URL("./assets/diamond@2x.png", import.meta.url).href,
  triangle: new URL("./assets/triangle@2x.png", import.meta.url).href,
  line: new URL("./assets/line.diagonal@2x.png", import.meta.url).href,
  arrow: new URL(
    "./assets/line.diagonal.trianglehead.up.right@2x.png",
    import.meta.url,
  ).href,
  "arrow-curved": new URL(
    "./assets/point.topleft.down.to.point.bottomright.curvepath@2x.png",
    import.meta.url,
  ).href,

  // Text alignment
  "align-left": new URL("./assets/text.alignleft@2x.png", import.meta.url)
    .href,
  "align-center": new URL("./assets/text.aligncenter@2x.png", import.meta.url)
    .href,
  "align-right": new URL("./assets/text.alignright@2x.png", import.meta.url)
    .href,
};

// SF exports carry uneven intrinsic padding; a few glyphs need a small optical
// correction so they sit at the same visual weight as their neighbours.
export const SF_ICON_SCALE: Partial<Record<IconName, number>> = {
  plus: 0.86,
  minus: 0.86,
  "zoom-in": 0.86,
  "zoom-out": 0.86,
  close: 0.86,
  check: 0.88,
  "chevron-down": 0.82,
  "chevron-up": 0.82,
  "chevron-left": 0.82,
  "chevron-right": 0.82,
  line: 0.88,
  menu: 0.92,
};
