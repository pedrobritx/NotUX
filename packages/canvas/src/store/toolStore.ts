import type { StrokeStyle, ToolKind } from "@notux/types";
import { create } from "zustand";

export interface ToolOptions {
  color: string;
  size: number;
  fill: string | null;
  // 0..1. Applied to new strokes (M7 dock). 1 = fully opaque.
  opacity: number;
  // Instrument variant the active tool draws with (pen by default).
  style: StrokeStyle;
}

interface ToolStoreState {
  tool: ToolKind;
  options: ToolOptions;
  selection: Set<string>;
  setTool(tool: ToolKind): void;
  setColor(color: string): void;
  setSize(size: number): void;
  setFill(fill: string | null): void;
  setOpacity(opacity: number): void;
  setStyle(style: StrokeStyle): void;
  // Atomic multi-field update — used by the dock to push a whole instrument
  // preset (color + width + opacity + style) in one shot.
  setOptions(patch: Partial<ToolOptions>): void;
  setSelection(ids: Iterable<string>): void;
  clearSelection(): void;
}

const DEFAULT_OPTIONS: ToolOptions = {
  color: "#1c1c1e",
  size: 4,
  fill: null,
  opacity: 1,
  style: "pen",
};

export const useToolStore = create<ToolStoreState>((set) => ({
  tool: "pen",
  options: DEFAULT_OPTIONS,
  selection: new Set(),

  setTool(tool) {
    // Switching away from select clears the selection so the overlay doesn't
    // linger on an inactive tool.
    set((s) => ({
      tool,
      selection: tool === "select" ? s.selection : new Set(),
    }));
  },
  setColor(color) {
    set((s) => ({ options: { ...s.options, color } }));
  },
  setSize(size) {
    set((s) => ({ options: { ...s.options, size } }));
  },
  setFill(fill) {
    set((s) => ({ options: { ...s.options, fill } }));
  },
  setOpacity(opacity) {
    set((s) => ({ options: { ...s.options, opacity } }));
  },
  setStyle(style) {
    set((s) => ({ options: { ...s.options, style } }));
  },
  setOptions(patch) {
    set((s) => ({ options: { ...s.options, ...patch } }));
  },
  setSelection(ids) {
    set({ selection: new Set(ids) });
  },
  clearSelection() {
    set({ selection: new Set() });
  },
}));
