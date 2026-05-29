import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose(): void;
  /** Element the popover floats above (or below). */
  anchorRef: RefObject<HTMLElement>;
  placement?: "top" | "bottom";
  /** Draw a speech-bubble tail pointing at the anchor (top placement only). */
  tail?: boolean;
  className?: string;
  children?: ReactNode;
}

const MARGIN = 8;

/** Floating panel anchored to an element, portalled above the canvas. */
export function Popover({
  open,
  onClose,
  anchorRef,
  placement = "top",
  tail,
  className,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; tailX: number }>({
    left: -9999,
    top: -9999,
    tailX: 0,
  });

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const el = ref.current;
    if (!anchor || !el) return;
    const a = anchor.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const anchorCenter = a.left + a.width / 2;
    let left = anchorCenter - r.width / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - r.width - MARGIN));
    const top =
      placement === "top" ? a.top - r.height - 12 : a.bottom + 12;
    setPos({ left, top, tailX: anchorCenter - left });
  }, [anchorRef, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // A second pass next frame once children (and fonts) have settled.
    const id = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(id);
  }, [open, reposition, children]);

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => reposition();
    window.addEventListener("resize", onScrollResize);
    window.addEventListener("scroll", onScrollResize, true);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    // Defer so the click that opened the popover doesn't immediately close it.
    const id = window.setTimeout(
      () => window.addEventListener("mousedown", onDown),
      0,
    );
    return () => {
      window.removeEventListener("resize", onScrollResize);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.clearTimeout(id);
    };
  }, [open, reposition, onClose, anchorRef]);

  if (!open) return null;

  const cls =
    "glass-popover" +
    (tail && placement === "top" ? " glass-popover--tail-bottom" : "") +
    (className ? ` ${className}` : "");

  return createPortal(
    <div
      ref={ref}
      className={cls}
      style={
        {
          left: pos.left,
          top: pos.top,
          ["--tail-x" as string]: `${pos.tailX}px`,
        } as React.CSSProperties
      }
      role="dialog"
    >
      {children}
    </div>,
    document.body,
  );
}
