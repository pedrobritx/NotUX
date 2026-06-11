export { CanvasStage } from "./CanvasStage";
export { useViewportStore } from "./store/viewportStore";
export { shapeBounds, translateShape } from "./tools/shapeOps";
export type { Bounds } from "./tools/shapeOps";
export { alignShapes, distributeShapes } from "./tools/alignOps";
export type { AlignEdge } from "./tools/alignOps";
export { newShapeId } from "./ids";
export { useAwareness } from "./hooks/useAwareness";
export { useRemoteCursors } from "./hooks/useRemoteCursors";
export type { RemoteCursor } from "./hooks/useRemoteCursors";
export { useUndoManager } from "./hooks/useUndoManager";
export { useShapeStore } from "./store/shapeStore";
export type { RealtimeConfig } from "./store/shapeStore";
export { useToolStore } from "./store/toolStore";
export type { ToolOptions } from "./store/toolStore";
export { useCommandStore } from "./store/commandStore";
export { useAssetStore } from "./store/assetStore";
export { useSettingsStore } from "./store/settingsStore";
export { usePrefsStore } from "./store/prefsStore";
export { useFollowStore } from "./store/followStore";
export {
  BACKGROUND_PRESETS,
  effectiveBackground,
  isDarkBackground,
} from "./theme/backgroundPresets";
export { DEFAULT_PAGE_ID, usePageStore } from "./store/pageStore";
export type { PageMeta } from "./store/pageStore";
export {
  useDockStore,
  INSTRUMENT_IDS,
  INSTRUMENT_MAP,
  PEN_STYLES,
  WIDTH_PRESETS,
} from "./store/dockStore";
export type { InstrumentId, DockPosition } from "./store/dockStore";
export type { ShapeStore } from "./store/shapeStore";
export { useTextEditStore } from "./store/textEditStore";
export type { TextEditSession } from "./store/textEditStore";
export { exportBoardToPdf } from "./export/exportBoardToPdf";
export type { ExportOptions, ExportPage } from "./export/exportBoardToPdf";
