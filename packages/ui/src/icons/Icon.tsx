import type { ReactNode, SVGProps } from "react";

// A small, flat 24×24 stroke-icon set used across the dock, the app menu, the
// shapes flyout and the color picker. Icons inherit `currentColor` so they pick
// up the surrounding text color in either theme.
export type IconName =
  | "select"
  | "hand"
  | "pen"
  | "eraser"
  | "highlighter"
  | "text"
  | "shapes"
  | "sticky"
  | "plus"
  | "minus"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "grip"
  | "menu"
  | "close"
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
  | "sun"
  | "moon"
  | "upload"
  | "eyedropper"
  | "pages"
  | "square"
  | "rounded"
  | "circle"
  | "diamond"
  | "triangle"
  | "line"
  | "arrow"
  | "arrow-curved"
  | "arrow-elbow";

const PATHS: Record<IconName, ReactNode> = {
  select: <path d="M5 3l6 16 2-6 6-2z" />,
  hand: (
    <path d="M8 11V6.5a1.5 1.5 0 013 0V11m0-1V5a1.5 1.5 0 013 0v6m0-1V6.5a1.5 1.5 0 013 0V13c0 4-2.5 7-6 7s-5-2-6.5-4.5L5 13c-.7-1.2.8-2.4 1.8-1.4L8 13" />
  ),
  pen: <path d="M4 20l4-1L19 8a2 2 0 00-3-3L5 16z" />,
  eraser: (
    <>
      <path d="M4 15l6-6 7 7-4 4H8z" />
      <path d="M10 21h10" />
    </>
  ),
  highlighter: (
    <>
      <path d="M5 19l2-2 6-6 4 4-6 6-2 2H5z" />
      <path d="M13 5l4 4" />
    </>
  ),
  text: <path d="M5 5h14M12 5v14M9 19h6" />,
  shapes: (
    <>
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <circle cx="16.5" cy="7.5" r="4.5" />
    </>
  ),
  sticky: (
    <path d="M5 4h14v10l-5 5H5zM14 19v-5h5" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-up": <path d="M6 15l6-6 6 6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
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
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  undo: <path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" />,
  redo: <path d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" />,
  "zoom-in": (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M11 8v6M8 11h6M20 20l-4.5-4.5" />
    </>
  ),
  "zoom-out": (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M8 11h6M20 20l-4.5-4.5" />
    </>
  ),
  "zoom-reset": <path d="M8 3H4v4M16 3h4v4M16 21h4v-4M8 21H4v-4" />,
  trash: <path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 017.5-2" />
    </>
  ),
  "to-front": (
    <>
      <rect x="8" y="8" width="11" height="11" rx="1" />
      <path d="M5 14V5h9" />
    </>
  ),
  "to-back": (
    <>
      <rect x="5" y="5" width="11" height="11" rx="1" />
      <path d="M19 10v9h-9" />
    </>
  ),
  forward: <path d="M5 9l7-5 7 5-7 5zM5 13l7 5 7-5" />,
  backward: <path d="M5 15l7 5 7-5M5 11l7-5 7 5-7 5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  moon: <path d="M20 14a8 8 0 11-9-11 6 6 0 009 11z" />,
  upload: <path d="M12 16V5m-4 4l4-4 4 4M5 19h14" />,
  eyedropper: <path d="M18 5a2 2 0 00-3 0l-1.5 1.5-1-1-1.5 1.5 1 1L4 16v4h4l7-7 1 1 1.5-1.5-1-1L18 8a2 2 0 000-3z" />,
  pages: (
    <>
      <rect x="7" y="3" width="12" height="14" rx="1.5" />
      <path d="M5 7v12a2 2 0 002 2h9" />
    </>
  ),
  square: <rect x="4" y="4" width="16" height="16" rx="0.5" />,
  rounded: <rect x="4" y="4" width="16" height="16" rx="4" />,
  circle: <circle cx="12" cy="12" r="8" />,
  diamond: <path d="M12 3l9 9-9 9-9-9z" />,
  triangle: <path d="M12 4l9 16H3z" />,
  line: <path d="M5 19L19 5" />,
  arrow: <path d="M5 19L19 5M11 5h8v8" />,
  "arrow-curved": <path d="M5 19C5 11 11 5 19 5M12 5h7v7" />,
  "arrow-elbow": <path d="M5 19h9V5M9 9l5-4 5 4" />,
};

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** Solid icons (sticky/diamond/etc.) read better filled in some contexts. */
  filled?: boolean;
}

export function Icon({ name, size = 22, filled, ...rest }: Props) {
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
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
