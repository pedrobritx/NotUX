import { create } from "zustand";
import type { ViewportState } from "../viewport/Viewport";

// CanvasStage publishes its live viewport + container size here so DOM-side
// chrome (the contextual selection toolbar, future minimap, …) can project
// world-space geometry into screen space without living inside the stage.
interface ViewportStoreState {
  viewport: ViewportState;
  size: { w: number; h: number };
  publish(viewport: ViewportState, size: { w: number; h: number }): void;
}

export const useViewportStore = create<ViewportStoreState>((set) => ({
  viewport: { x: 0, y: 0, scale: 1 },
  size: { w: 0, h: 0 },
  publish(viewport, size) {
    set({ viewport, size });
  },
}));
