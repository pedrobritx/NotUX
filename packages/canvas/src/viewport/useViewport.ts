import { useCallback, useState } from "react";
import { type ViewportState, zoomAt } from "./Viewport";

const INITIAL: ViewportState = { x: 0, y: 0, scale: 1 };

export interface UseViewport {
  viewport: ViewportState;
  setViewport: (v: ViewportState) => void;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (anchorSx: number, anchorSy: number, factor: number) => void;
  reset: () => void;
}

export function useViewport(initial: ViewportState = INITIAL): UseViewport {
  const [viewport, setViewport] = useState<ViewportState>(initial);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const zoomBy = useCallback(
    (anchorSx: number, anchorSy: number, factor: number) => {
      setViewport((v) => zoomAt(v, anchorSx, anchorSy, v.scale * factor));
    },
    [],
  );

  const reset = useCallback(() => setViewport(INITIAL), []);

  return { viewport, setViewport, panBy, zoomBy, reset };
}
