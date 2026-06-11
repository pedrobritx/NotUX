import type * as Y from "yjs";
import { create } from "zustand";
import {
  DEFAULT_BOARD_SETTINGS,
  getBoardDoc,
  getSettingsMap,
  readBoardSettings,
  setBoardSetting,
  type BackgroundPresetId,
  type GridStyle,
} from "@notux/sync";

// Zustand mirror of the board's synced presentation settings (background +
// grid). Mirrors the pageStore binding pattern: initSettings observes the Yjs
// settings map and refreshes on local or remote writes.
interface SettingsStoreState {
  background: BackgroundPresetId;
  grid: GridStyle;
  _doc: Y.Doc | null;
  _unobserve: (() => void) | null;

  initSettings(boardId: string): void;
  setBackground(id: BackgroundPresetId): void;
  setGrid(style: GridStyle): void;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  background: DEFAULT_BOARD_SETTINGS.background,
  grid: DEFAULT_BOARD_SETTINGS.grid,
  _doc: null,
  _unobserve: null,

  initSettings(boardId) {
    const doc = getBoardDoc(boardId);
    if (get()._doc === doc) return;
    get()._unobserve?.();

    const map = getSettingsMap(doc);
    const refresh = () => set(readBoardSettings(doc));
    map.observe(refresh);
    set({ _doc: doc, _unobserve: () => map.unobserve(refresh) });
    refresh();
  },

  setBackground(id) {
    const doc = get()._doc;
    if (!doc) return;
    setBoardSetting(doc, "background", id);
  },

  setGrid(style) {
    const doc = get()._doc;
    if (!doc) return;
    setBoardSetting(doc, "grid", style);
  },
}));
