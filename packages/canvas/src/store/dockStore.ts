import type { StrokeStyle, ToolKind } from "@notux/types";
import { create } from "zustand";
import { useToolStore } from "./toolStore";

// The drawing instruments the dock can draw with. The Pen button cycles through
// the pen-family styles (pen/fineliner/pencil/marker) via its popover; the
// highlighter and eraser are their own buttons.
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

// The pen-family styles offered in the Pen popover. "Fineliner" was retired
// from the picker — it duplicated Pen at a thin width preset — but stays a
// valid InstrumentId/StrokeStyle so existing boards keep rendering.
export const PEN_STYLES: readonly InstrumentId[] = [
  "pen",
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

// The five width samples shown in the dock popover, per instrument.
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

export interface DockPosition {
  x: number;
  y: number;
}

interface DockStoreState {
  instruments: Record<InstrumentId, InstrumentState>;
  // The active drawing instrument (drives the color swatch + width popover).
  activeInstrumentId: InstrumentId;
  // Which pen-family style the Pen button currently draws with.
  penStyle: InstrumentId;
  // Dock chrome.
  collapsed: boolean;
  position: DockPosition | null; // null = default bottom-center
  // Popover toggles.
  penPopoverOpen: boolean;
  eraserPopoverOpen: boolean;
  shapesFlyoutOpen: boolean;
  stickyPopoverOpen: boolean;
  colorPickerOpen: boolean;
  importPopoverOpen: boolean;

  selectInstrument(id: InstrumentId): void;
  setPenStyle(id: InstrumentId): void;
  setActiveColor(color: string): void;
  setActiveWidth(width: number): void;
  setActiveOpacity(opacity: number): void;

  setCollapsed(v: boolean): void;
  setPosition(p: DockPosition | null): void;

  setPenPopoverOpen(open: boolean): void;
  setEraserPopoverOpen(open: boolean): void;
  setShapesFlyoutOpen(open: boolean): void;
  setStickyPopoverOpen(open: boolean): void;
  setColorPickerOpen(open: boolean): void;
  setImportPopoverOpen(open: boolean): void;
  closeAllPopovers(): void;
}

function initialInstruments(): Record<InstrumentId, InstrumentState> {
  const out = {} as Record<InstrumentId, InstrumentState>;
  for (const id of INSTRUMENT_IDS) {
    const d = INSTRUMENT_MAP[id];
    out[id] = { color: d.color, width: d.width, opacity: d.opacity };
  }
  return out;
}

// ---- persistence (collapsed + dock position) ----------------------------

const PERSIST_KEY = "notux-dock";

function loadPersisted(): { collapsed: boolean; position: DockPosition | null } {
  if (typeof window === "undefined") return { collapsed: false, position: null };
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return { collapsed: false, position: null };
    const v = JSON.parse(raw) as { collapsed?: boolean; position?: DockPosition | null };
    return { collapsed: !!v.collapsed, position: v.position ?? null };
  } catch {
    return { collapsed: false, position: null };
  }
}

function persist(state: { collapsed: boolean; position: DockPosition | null }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ collapsed: state.collapsed, position: state.position }),
    );
  } catch {
    /* storage unavailable */
  }
}

// Push a whole instrument preset (tool + ink/width/opacity/style) to the tool
// store. Used when *selecting* an instrument.
function selectInstrumentInTool(id: InstrumentId, inst: InstrumentState) {
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

export const useDockStore = create<DockStoreState>((set, get) => {
  const persisted = loadPersisted();
  return {
    instruments: initialInstruments(),
    activeInstrumentId: "pen",
    penStyle: "pen",
    collapsed: persisted.collapsed,
    position: persisted.position,
    penPopoverOpen: false,
    eraserPopoverOpen: false,
    shapesFlyoutOpen: false,
    stickyPopoverOpen: false,
    colorPickerOpen: false,
    importPopoverOpen: false,

    selectInstrument(id) {
      set({
        activeInstrumentId: id,
        penPopoverOpen: false,
        eraserPopoverOpen: false,
        shapesFlyoutOpen: false,
        stickyPopoverOpen: false,
        colorPickerOpen: false,
        importPopoverOpen: false,
      });
      selectInstrumentInTool(id, get().instruments[id]);
    },

    setPenStyle(id) {
      set({ penStyle: id, activeInstrumentId: id });
      selectInstrumentInTool(id, get().instruments[id]);
    },

    // Option tweaks update the active instrument's memory AND patch the current
    // tool's options — but never call setTool, so they don't knock the user off
    // a shape/sticky/text tool.
    setActiveColor(color) {
      const id = get().activeInstrumentId;
      const inst = { ...get().instruments[id], color };
      set({ instruments: { ...get().instruments, [id]: inst } });
      useToolStore.getState().setOptions({ color });
    },
    setActiveWidth(width) {
      const id = get().activeInstrumentId;
      const inst = { ...get().instruments[id], width };
      set({ instruments: { ...get().instruments, [id]: inst } });
      useToolStore.getState().setOptions({ size: width });
    },
    setActiveOpacity(opacity) {
      const id = get().activeInstrumentId;
      const inst = { ...get().instruments[id], opacity };
      set({ instruments: { ...get().instruments, [id]: inst } });
      useToolStore.getState().setOptions({ opacity });
    },

    setCollapsed(v) {
      set({ collapsed: v });
      persist({ collapsed: v, position: get().position });
    },
    setPosition(p) {
      set({ position: p });
      persist({ collapsed: get().collapsed, position: p });
    },

    setPenPopoverOpen(open) {
      set({ penPopoverOpen: open });
    },
    setEraserPopoverOpen(open) {
      set({ eraserPopoverOpen: open });
    },
    setShapesFlyoutOpen(open) {
      set({ shapesFlyoutOpen: open });
    },
    setStickyPopoverOpen(open) {
      set({ stickyPopoverOpen: open });
    },
    setColorPickerOpen(open) {
      set({ colorPickerOpen: open });
    },
    setImportPopoverOpen(open) {
      set({ importPopoverOpen: open });
    },
    closeAllPopovers() {
      set({
        penPopoverOpen: false,
        eraserPopoverOpen: false,
        shapesFlyoutOpen: false,
        stickyPopoverOpen: false,
        colorPickerOpen: false,
        importPopoverOpen: false,
      });
    },
  };
});
