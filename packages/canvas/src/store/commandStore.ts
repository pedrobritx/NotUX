import { create } from "zustand";

// A tiny command registry so chrome outside the canvas (the app menu) can invoke
// actions that physically live inside CanvasStage — undo/redo (bound to the
// per-page Y.UndoManager) and viewport zoom (local CanvasStage state). The stage
// registers handlers on mount; consumers call them and read canUndo/canRedo for
// disabled states. All fields are optional until the stage mounts.
interface CommandStoreState {
  undo?: () => void;
  redo?: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  zoomReset?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  register(patch: Partial<Omit<CommandStoreState, "register">>): void;
}

export const useCommandStore = create<CommandStoreState>((set) => ({
  canUndo: false,
  canRedo: false,
  register(patch) {
    set(patch);
  },
}));
