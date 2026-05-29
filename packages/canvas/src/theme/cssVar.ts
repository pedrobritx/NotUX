// Konva can't read CSS variables, so layers/renderers resolve theme tokens at
// render time. Components re-read this whenever they re-render (CanvasStage is
// given a changing `theme` prop on toggle, which cascades a re-render).
export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}
