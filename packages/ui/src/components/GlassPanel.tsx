import type { CSSProperties, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  role?: string;
  "aria-label"?: string;
}

/** Frosted translucent container — the base material for docks and panels. */
export function GlassPanel({ children, className, style, ...rest }: Props) {
  return (
    <div
      className={"glass-panel" + (className ? ` ${className}` : "")}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
