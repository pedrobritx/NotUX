import type { ToolKind } from "@notux/types";
import { create } from "zustand";

export interface ToolOptions {
  color: string;
  size: number;
  fill: string | null;
}

interface ToolStoreState {
  tool: ToolKind;
  options: ToolOptions;
  selection: Set<string>;
  setTool(tool: ToolKind): void;
  setColor(color: string): void;
  setSize(size: number): void;
  setFill(fill: string | null): void;
  setSelection(ids: Iterable<string>): void;
  clearSelection(): void;
}

const DEFAULT_OPTIONS: ToolOptions = {
  color: "#ffffff",
  size: 4,
  fill: null,
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
  setSelection(ids) {
    set({ selection: new Set(ids) });
  },
  clearSelection() {
    set({ selection: new Set() });
  },
}));
