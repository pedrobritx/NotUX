import * as Y from "yjs";
import { LOCAL_ORIGIN } from "./origin";

// Board-wide presentation settings (canvas background + grid style), stored in
// a dedicated Y.Map so they sync, autosave and snapshot with the document.
// The map is intentionally OUTSIDE the UndoManager scope (which tracks only
// the pages map and page list), so changing the paper is never captured into
// anyone's Cmd+Z stack.

export type BackgroundPresetId = "default" | "sand" | "grey" | "blue" | "green";
export type GridStyle = "dots" | "lines" | "ruled" | "plain";

export interface BoardSettings {
  background: BackgroundPresetId;
  grid: GridStyle;
}

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  background: "default",
  grid: "dots",
};

const BACKGROUNDS: readonly BackgroundPresetId[] = [
  "default",
  "sand",
  "grey",
  "blue",
  "green",
];
const GRIDS: readonly GridStyle[] = ["dots", "lines", "ruled", "plain"];

export function getSettingsMap(doc: Y.Doc): Y.Map<string> {
  return doc.getMap<string>("settings");
}

/** Read the synced settings, falling back to defaults for missing or
 *  unrecognised values (peers on older builds write nothing). */
export function readBoardSettings(doc: Y.Doc): BoardSettings {
  const map = getSettingsMap(doc);
  const bg = map.get("background") as BackgroundPresetId | undefined;
  const grid = map.get("grid") as GridStyle | undefined;
  return {
    background: bg && BACKGROUNDS.includes(bg) ? bg : DEFAULT_BOARD_SETTINGS.background,
    grid: grid && GRIDS.includes(grid) ? grid : DEFAULT_BOARD_SETTINGS.grid,
  };
}

export function setBoardSetting<K extends keyof BoardSettings>(
  doc: Y.Doc,
  key: K,
  value: BoardSettings[K],
): void {
  doc.transact(() => {
    getSettingsMap(doc).set(key, value);
  }, LOCAL_ORIGIN);
}
