import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  /** Circular icon button. */
  round?: boolean;
  /** Accent highlight (e.g. an active tool). */
  active?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Pill / round Liquid Glass button. */
export function GlassButton({
  children,
  round,
  active,
  className,
  type = "button",
  ...rest
}: Props) {
  const cls =
    "glass-button" +
    (round ? " glass-button--round" : "") +
    (active ? " glass-button--active" : "") +
    (className ? ` ${className}` : "");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
