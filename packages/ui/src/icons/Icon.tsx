import type { CSSProperties, ReactNode } from "react";
import { SF_ICON_SCALE, SF_ICON_URLS } from "./sfIcons";

// The app's icon set. Most names map to SF Symbol artwork (see sfIcons.ts)
// rendered as a CSS-masked span so the glyph tints with `currentColor`. A few
// names have no SF counterpart and keep a hand-drawn 24×24 stroke SVG below.
export type IconName =
  | "select"
  | "hand"
  | "pen"
  | "eraser"
  | "highlighter"
  | "text"
  | "shapes"
  | "sticky"
  | "media"
  | "plus"
  | "minus"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "grip"
  | "menu"
  | "close"
  | "check"
  | "ellipsis"
  | "search"
  | "star"
  | "clock"
  | "archive"
  | "rename"
  | "board"
  | "duplicate"
  | "sliders"
  | "opacity"
  | "undo"
  | "redo"
  | "zoom-in"
  | "zoom-out"
  | "zoom-reset"
  | "trash"
  | "lock"
  | "unlock"
  | "to-front"
  | "to-back"
  | "forward"
  | "backward"
  | "obj-align-left"
  | "obj-align-center"
  | "obj-align-right"
  | "obj-align-top"
  | "obj-align-middle"
  | "obj-align-bottom"
  | "distribute-h"
  | "distribute-v"
  | "sun"
  | "moon"
  | "upload"
  | "download"
  | "share"
  | "link"
  | "eyedropper"
  | "pages"
  | "photo"
  | "audio"
  | "file"
  | "video"
  | "folder"
  | "spotlight"
  | "people"
  | "cursors"
  | "background"
  | "align-left"
  | "align-center"
  | "align-right"
  | "grid-dots"
  | "grid-lines"
  | "grid-ruled"
  | "grid-plain"
  | "square"
  | "rounded"
  | "circle"
  | "diamond"
  | "triangle"
  | "line"
  | "arrow"
  | "arrow-curved"
  | "arrow-elbow"
  | "history";

// Hand-drawn fallbacks for names without SF artwork.
const PATHS: Partial<Record<IconName, ReactNode>> = {
  sticky: <path d="M5 4h14v10l-5 5H5zM14 19v-5h5" />,
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>
  ),
};

interface Props {
  name: IconName;
  size?: number;
  /** Solid icons (sticky/diamond/etc.) read better filled in some contexts. */
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function Icon({ name, size = 22, filled, className, style, title }: Props) {
  const url = SF_ICON_URLS[name];
  if (url) {
    const scale = SF_ICON_SCALE[name];
    const mask = `url("${url}")`;
    return (
      <span
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
        aria-label={title}
        className={"icon-mask" + (className ? ` ${className}` : "")}
        style={{
          width: size,
          height: size,
          WebkitMaskImage: mask,
          maskImage: mask,
          ...(scale
            ? {
                WebkitMaskSize: `${scale * 100}%`,
                maskSize: `${scale * 100}%`,
              }
            : null),
          ...style,
        }}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
