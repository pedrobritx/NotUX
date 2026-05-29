import {
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Popover } from "./Popover";

interface Props {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement>;
  className?: string;
  children?: ReactNode;
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

/**
 * Responsive container: a bottom sheet on narrow screens, an anchored
 * Popover on wide ones. Used for the color picker.
 */
export function Sheet({ open, onClose, anchorRef, className, children }: Props) {
  const narrow = useIsNarrow();

  if (narrow) {
    if (!open) return null;
    return createPortal(
      <>
        <div className="glass-sheet-backdrop" onMouseDown={onClose} />
        <div className={"glass-sheet" + (className ? ` ${className}` : "")} role="dialog">
          {children}
        </div>
      </>,
      document.body,
    );
  }

  return (
    <Popover open={open} onClose={onClose} anchorRef={anchorRef} placement="top">
      {children}
    </Popover>
  );
}
