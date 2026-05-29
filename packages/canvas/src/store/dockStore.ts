import type { StrokeStyle, ToolKind } from "@notux/types";
import { create } from "zustand";
import { useToolStore } from "./toolStore";

// The drawing instruments shown in the Liquid Glass dock (ruler omitted in
// M7). Structurally identical to @notux/ui's InstrumentKind, kept here so the
// canvas package stays free of a dependency on the UI package.
export type InstrumentId =
  | "pen"
  | "fineliner"
  | "highlighter"
  | "eraser"
  | "pencil"
  | "marker";

export const INSTRUMENT_IDS: readonly InstrumentId[] = [
  "pen",
  "fineliner",
  "highlighter",
  "eraser",
  "pencil",
  "marker",
] as const;

interface InstrumentDef {
  toolKind: ToolKind; // canvas tool that backs it
  style: StrokeStyle; // render variant
  color: string;
  width: number;
  opacity: number;
}

// id → backing tool kind + render style + factory defaults.
export const INSTRUMENT_MAP: Record<InstrumentId, InstrumentDef> = {
  pen: { toolKind: "pen", style: "pen", color: "#1c1c1e", width: 4, opacity: 1 },
  fineliner: {
    toolKind: "pen",
    style: "fineliner",
    color: "#1c1c1e",
    width: 2,
    opacity: 1,
  },
  highlighter: {
    toolKind: "highlighter",
    style: "highlighter",
    color: "#ffd60a",
    width: 16,
    opacity: 0.35,
  },
  eraser: {
    toolKind: "eraser",
    style: "pen",
    color: "#1c1c1e",
    width: 16,
    opacity: 1,
  },
  pencil: {
    toolKind: "pen",
    style: "pencil",
    color: "#1c1c1e",
    width: 3,
    opacity: 0.9,
  },
  marker: {
    toolKind: "pen",
    style: "marker",
    color: "#1c1c1e",
    width: 10,
    opacity: 1,
  },
};

// The five width samples shown in the dock popover (Frame 2), per instrument.
export const WIDTH_PRESETS: Record<InstrumentId, number[]> = {
  pen: [2, 4, 6, 9, 13],
  fineliner: [1, 2, 3, 4, 6],
  highlighter: [10, 16, 22, 30, 40],
  eraser: [8, 16, 24, 36, 50],
  pencil: [2, 3, 5, 7, 10],
  marker: [6, 10, 14, 20, 28],
};

interface InstrumentState {
  color: string;
  width: number;
  opacity: number;
}

interface DockStoreState {
  instruments: Record<InstrumentId, InstrumentState>;
  activeInstrumentId: InstrumentId;
  trayOpen: boolean;
  widthPopoverOpen: boolean;
  colorPickerOpen: boolean;
  selectInstrument(id: InstrumentId): void;
  setActiveColor(color: string): void;
  setActiveWidth(width: number): void;
  setActiveOpacity(opacity: number): void;
  setTrayOpen(open: boolean): void;
  setWidthPopoverOpen(open: boolean): void;
  setColorPickerOpen(open: boolean): void;
}

function initialInstruments(): Record<InstrumentId, InstrumentState> {
  const out = {} as Record<InstrumentId, InstrumentState>;
  for (const id of INSTRUMENT_IDS) {
    const d = INSTRUMENT_MAP[id];
    out[id] = { color: d.color, width: d.width, opacity: d.opacity };
  }
  return out;
}

// Tools read from toolStore.options (see CanvasStage.buildToolContext), so the
// dock resolves the active instrument into toolStore on every change.
function pushToTool(id: InstrumentId, inst: InstrumentState) {
  const def = INSTRUMENT_MAP[id];
  const tool = useToolStore.getState();
  tool.setTool(def.toolKind);
  tool.setOptions({
    color: inst.color,
    size: inst.width,
    opacity: inst.opacity,
    style: def.style,
  });
}

export const useDockStore = create<DockStoreState>((set, get) => ({
  instruments: initialInstruments(),
  activeInstrumentId: "pen",
  trayOpen: false,
  widthPopoverOpen: false,
  colorPickerOpen: false,

  selectInstrument(id) {
    set({
      activeInstrumentId: id,
      trayOpen: false,
      widthPopoverOpen: false,
      colorPickerOpen: false,
    });
    pushToTool(id, get().instruments[id]);
  },

  setActiveColor(color) {
    const id = get().activeInstrumentId;
    const inst = { ...get().instruments[id], color };
    set({ instruments: { ...get().instruments, [id]: inst } });
    pushToTool(id, inst);
  },

  setActiveWidth(width) {
    const id = get().activeInstrumentId;
    const inst = { ...get().instruments[id], width };
    set({ instruments: { ...get().instruments, [id]: inst } });
    pushToTool(id, inst);
  },

  setActiveOpacity(opacity) {
    const id = get().activeInstrumentId;
    const inst = { ...get().instruments[id], opacity };
    set({ instruments: { ...get().instruments, [id]: inst } });
    pushToTool(id, inst);
  },

  setTrayOpen(open) {
    set({ trayOpen: open });
  },
  setWidthPopoverOpen(open) {
    set({ widthPopoverOpen: open });
  },
  setColorPickerOpen(open) {
    set({ colorPickerOpen: open });
  },
}));
