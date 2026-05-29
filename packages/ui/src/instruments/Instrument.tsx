import type { CSSProperties } from "react";

export type InstrumentKind =
  | "pen"
  | "fineliner"
  | "highlighter"
  | "eraser"
  | "pencil"
  | "marker";

export const INSTRUMENT_KINDS: readonly InstrumentKind[] = [
  "pen",
  "fineliner",
  "highlighter",
  "eraser",
  "pencil",
  "marker",
] as const;

interface Props {
  kind: InstrumentKind;
  /** The ink color for tips / bands. */
  color: string;
  selected?: boolean;
  lifted?: boolean;
  /** 0..1 — when < 1 a small percentage badge is drawn at the foot. */
  opacity?: number;
}

const BODY = "#fcfcfd";
const BODY_EDGE = "rgba(0,0,0,0.14)";
const BODY_SHADE = "rgba(0,0,0,0.06)";

// A shared white barrel from y=24 down past the foot. Tips are drawn on top
// per instrument so each reads distinctly at dock size.
function Barrel({ width = 16, x = 12 }: { width?: number; x?: number }) {
  return (
    <>
      <rect
        x={x}
        y={24}
        width={width}
        height={58}
        rx={width / 2.6}
        fill={BODY}
        stroke={BODY_EDGE}
        strokeWidth={1}
      />
      <rect
        x={x + width - 5}
        y={26}
        width={3}
        height={54}
        rx={1.5}
        fill={BODY_SHADE}
      />
    </>
  );
}

function Tip({ kind, color }: { kind: InstrumentKind; color: string }) {
  switch (kind) {
    case "pen":
      return (
        <>
          <Barrel />
          {/* black conical nib */}
          <path d="M20 4 L13 26 L27 26 Z" fill="#1c1c1e" />
          <path d="M20 4 L16.5 15 L23.5 15 Z" fill="#3a3a3c" />
          {/* ink band */}
          <rect x={12} y={70} width={16} height={5} fill={color} />
        </>
      );
    case "fineliner":
      return (
        <>
          <Barrel width={13} x={13.5} />
          {/* stepped collar */}
          <rect x={15} y={24} width={10} height={8} rx={2} fill={BODY} stroke={BODY_EDGE} />
          {/* thin metal nib */}
          <rect x={19} y={8} width={2} height={16} fill="#9aa0a6" />
          <rect x={18.5} y={6} width={3} height={3} fill={color} />
          {/* ink band */}
          <rect x={13.5} y={73} width={13} height={4} fill={color} />
        </>
      );
    case "highlighter":
      return (
        <>
          {/* wide barrel, faintly tinted by the ink */}
          <rect x={9} y={24} width={22} height={58} rx={7} fill={BODY} stroke={BODY_EDGE} />
          <rect x={9} y={24} width={22} height={58} rx={7} fill={color} opacity={0.12} />
          {/* chisel tip (angled), translucent */}
          <path d="M11 24 L29 24 L26 10 L17 6 Z" fill={color} opacity={0.85} />
          <rect x={13} y={66} width={14} height={6} rx={1} fill={color} />
        </>
      );
    case "eraser":
      return (
        <>
          <Barrel width={18} x={11} />
          {/* rounded eraser head in a soft coral, regardless of ink color */}
          <path
            d="M11 30 L11 16 Q11 8 20 8 Q29 8 29 16 L29 30 Z"
            fill="#f3897f"
          />
          <path d="M11 28 L29 28 L29 31 L11 31 Z" fill="#ffffff" opacity={0.85} />
        </>
      );
    case "pencil":
      return (
        <>
          <Barrel />
          {/* wood collar */}
          <path d="M13 26 L27 26 L24 18 L16 18 Z" fill="#e9d2a8" stroke={BODY_EDGE} strokeWidth={0.6} />
          {/* graphite cone with hatching */}
          <path d="M20 4 L15.5 19 L24.5 19 Z" fill="#6b7077" />
          <path d="M20 4 L17.5 12 L22.5 12 Z" fill="#9aa0a6" />
          <line x1={16.5} y1={16} x2={23.5} y2={16} stroke="#ffffff" strokeWidth={0.6} opacity={0.5} />
        </>
      );
    case "marker":
      return (
        <>
          <Barrel width={18} x={11} />
          {/* broad rounded nib in the ink color */}
          <path d="M13 24 L27 24 L24 12 Q20 7 16 12 Z" fill={color} />
          <path d="M13 24 L27 24 L26 21 L14 21 Z" fill="rgba(0,0,0,0.12)" />
          <rect x={11} y={68} width={18} height={6} rx={1} fill={color} />
        </>
      );
  }
}

/** A faithful, stylized drawing instrument (PencilKit-style) for the dock. */
export function Instrument({ kind, color, selected, lifted, opacity = 1 }: Props) {
  const style: CSSProperties = {
    filter: lifted ? "drop-shadow(var(--instrument-shadow))" : undefined,
    transition: "filter 200ms ease",
  };
  const badge = opacity < 1 ? Math.round(opacity * 100) : null;
  return (
    <svg
      width={40}
      height={84}
      viewBox="0 0 40 84"
      style={style}
      aria-hidden
      focusable="false"
    >
      <Tip kind={kind} color={color} />
      {badge !== null && (
        <text
          x={20}
          y={82}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill={selected ? "var(--fg-0)" : "var(--fg-1)"}
        >
          {badge}
        </text>
      )}
    </svg>
  );
}
