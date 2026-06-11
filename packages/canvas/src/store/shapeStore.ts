import * as Y from "yjs";
import type { YShape } from "@notux/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import {
  getBoardDoc,
  getIndexedDbProvider,
  getSupabaseProvider,
  getAwareness,
  findPageMap,
  getPageMap,
  loadAutosave,
  startAutosave,
  LOCAL_ORIGIN,
  type Awareness,
} from "@notux/sync";

// Realtime collaboration config, injected by the web app before initBoard.
// Absent (null) in local-only mode (no Supabase env), where the board still
// works fully against IndexedDB.
export interface RealtimeConfig {
  client: SupabaseClient;
  identity: { name: string; color: string; avatarUrl?: string | null };
}

// One promise per boardId — concurrent callers for the same board share the
// same init sequence (handles React StrictMode double-invoke).
const _initPromises = new Map<string, Promise<void>>();

// Detaches the durable-autosave listeners for the previously initialised board.
// Stops the old loop before a new board's loop starts when switching boards.
let _stopAutosave: (() => void) | null = null;

interface ShapeStoreState {
  // Bumps on every Yjs mutation so React selectors re-render.
  revision: number;
  // True once IndexedDB has loaded existing data into the Y.Doc.
  synced: boolean;
  // Set ~300 ms after each document update (debounced).
  lastSaved: Date | null;
  // The active Y.Doc (null until initBoard resolves).
  _doc: Y.Doc | null;
  // Yjs awareness for presence/cursors, set during initBoard when realtime is
  // configured. Null in local-only mode.
  _awareness: Awareness | null;
  // Realtime config stashed by configureRealtime, consumed by initBoard.
  _realtimeConfig: RealtimeConfig | null;
  _bump(): void;

  // Inject (or clear) realtime collaboration config. Call before initBoard.
  configureRealtime(config: RealtimeConfig | null): void;

  // Must be called before any shape reads/writes. Idempotent per boardId.
  initBoard(boardId: string): Promise<void>;

  listShapes(pageId: string): YShape[];
  getShape(pageId: string, id: string): YShape | undefined;
  addShape(pageId: string, shape: YShape): void;
  updateShape(pageId: string, id: string, patch: Partial<YShape>): void;
  deleteShape(pageId: string, id: string): void;
  deleteShapes(pageId: string, ids: Iterable<string>): void;
  transact(fn: () => void): void;

  // Per-object lock (M5 P3). Locked shapes opt out of select-drag, transform,
  // delete, erase, and marquee — see SelectTool / EraserTool / TransformLayer.
  setLocked(pageId: string, id: string, locked: boolean): void;

  // Z-order (M5 P3). Each op rewrites a dense 0..n-1 `z` over the page in one
  // transaction so values stay compact and ordering is well-defined.
  bringToFront(pageId: string, ids: Iterable<string>): void;
  sendToBack(pageId: string, ids: Iterable<string>): void;
  bringForward(pageId: string, ids: Iterable<string>): void;
  sendBackward(pageId: string, ids: Iterable<string>): void;
}

type ArrangeMode = "front" | "back" | "forward" | "backward";

// Pure reorder of a z-sorted array (index 0 = back, last = front). Moves the
// selected ids per `mode`; the caller writes a dense z over the result.
function reorderForArrange(
  sorted: YShape[],
  selected: Set<string>,
  mode: ArrangeMode,
): YShape[] {
  const isSel = (s: YShape) => selected.has(s.id);
  if (mode === "front") {
    return [...sorted.filter((s) => !isSel(s)), ...sorted.filter(isSel)];
  }
  if (mode === "back") {
    return [...sorted.filter(isSel), ...sorted.filter((s) => !isSel(s))];
  }
  const arr = sorted.slice();
  if (mode === "forward") {
    // Top-down: swap each selected shape with the unselected neighbor above it.
    for (let i = arr.length - 2; i >= 0; i--) {
      const a = arr[i];
      const b = arr[i + 1];
      if (a && b && isSel(a) && !isSel(b)) {
        arr[i] = b;
        arr[i + 1] = a;
      }
    }
  } else {
    // backward: bottom-up, swap with the unselected neighbor below.
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i];
      const b = arr[i - 1];
      if (a && b && isSel(a) && !isSel(b)) {
        arr[i] = b;
        arr[i - 1] = a;
      }
    }
  }
  return arr;
}

function applyArrange(
  get: () => ShapeStoreState,
  pageId: string,
  idsIter: Iterable<string>,
  mode: ArrangeMode,
) {
  const ids = new Set(idsIter);
  if (ids.size === 0) return;
  const next = reorderForArrange(get().listShapes(pageId), ids, mode);
  get().transact(() => {
    next.forEach((s, i) => {
      if ((s.z ?? -1) !== i) get().updateShape(pageId, s.id, { z: i });
    });
  });
}

export const useShapeStore = create<ShapeStoreState>((set, get) => ({
  revision: 0,
  synced: false,
  lastSaved: null,
  _doc: null,
  _awareness: null,
  _realtimeConfig: null,

  _bump() {
    set((s) => ({ revision: s.revision + 1 }));
  },

  configureRealtime(config) {
    set({ _realtimeConfig: config });
  },

  initBoard(boardId) {
    const existing = _initPromises.get(boardId);
    if (existing) {
      // Already initialising / done — ensure _doc is wired to this store.
      set({ _doc: getBoardDoc(boardId) });
      return existing;
    }

    const promise = (async () => {
      const doc = getBoardDoc(boardId);
      set({ _doc: doc, synced: false, lastSaved: null });

      // Re-render whenever any shape in any page changes.
      doc.getMap<Y.Map<YShape>>("pages").observeDeep(() => get()._bump());

      // Debounced lastSaved timestamp after each update.
      let saveTimer: ReturnType<typeof setTimeout> | null = null;
      doc.on("update", () => {
        if (saveTimer !== null) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => set({ lastSaved: new Date() }), 300);
      });

      const provider = getIndexedDbProvider(boardId, doc);
      await provider.whenSynced;
      set({ synced: true });

      // Attach realtime sync AFTER IndexedDB has loaded, so the sync handshake
      // advertises a complete local state vector and exchanges only a minimal
      // diff with peers. Skipped entirely in local-only mode.
      const cfg = get()._realtimeConfig;
      if (cfg) {
        const awareness = getAwareness(boardId, doc);
        awareness.setLocalStateField("user", {
          name: cfg.identity.name,
          color: cfg.identity.color,
          avatarUrl: cfg.identity.avatarUrl ?? null,
        });
        getSupabaseProvider({ client: cfg.client, boardId, doc, awareness });
        set({ _awareness: awareness });

        // Durable persistence: merge the server-side autosave snapshot so a
        // fresh client (no IndexedDB) or a late-joiner arriving after every peer
        // has left still loads the board, then keep that row up to date. CRDT
        // merge means this is safe to run after IndexedDB + realtime attach.
        _stopAutosave?.();
        _stopAutosave = null;
        await loadAutosave(cfg.client, boardId, doc);
        _stopAutosave = startAutosave(cfg.client, boardId, doc);
      }
    })();

    _initPromises.set(boardId, promise);
    return promise;
  },

  listShapes(pageId) {
    const doc = get()._doc;
    if (!doc) return [];
    const pageMap = findPageMap(doc, pageId);
    if (!pageMap) return [];
    // Sort by z, falling back to insertion order (Y.Map iterates in insertion
    // order). A board with no z fields renders in exactly its insertion order.
    return Array.from(pageMap.values())
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (a.s.z ?? a.i) - (b.s.z ?? b.i) || a.i - b.i)
      .map((e) => e.s);
  },

  getShape(pageId, id) {
    const doc = get()._doc;
    if (!doc) return undefined;
    return findPageMap(doc, pageId)?.get(id);
  },

  addShape(pageId, shape) {
    const doc = get()._doc;
    if (!doc) return;
    const pageMap = getPageMap(doc, pageId);
    doc.transact(() => pageMap.set(shape.id, shape), LOCAL_ORIGIN);
  },

  updateShape(pageId, id, patch) {
    const doc = get()._doc;
    if (!doc) return;
    const pageMap = findPageMap(doc, pageId);
    if (!pageMap) return;
    const prev = pageMap.get(id);
    if (!prev) return;
    // Casting through unknown: Partial<YShape> across a discriminated union is
    // wider than any single variant — callers pass kind-compatible patches.
    doc.transact(
      () => pageMap.set(id, { ...prev, ...patch } as unknown as YShape),
      LOCAL_ORIGIN,
    );
  },

  deleteShape(pageId, id) {
    const doc = get()._doc;
    if (!doc) return;
    const pageMap = findPageMap(doc, pageId);
    if (!pageMap) return;
    doc.transact(() => pageMap.delete(id), LOCAL_ORIGIN);
  },

  deleteShapes(pageId, ids) {
    const doc = get()._doc;
    if (!doc) return;
    const pageMap = findPageMap(doc, pageId);
    if (!pageMap) return;
    doc.transact(() => {
      for (const id of ids) pageMap.delete(id);
    }, LOCAL_ORIGIN);
  },

  transact(fn) {
    const doc = get()._doc;
    if (!doc) {
      fn();
      return;
    }
    doc.transact(fn, LOCAL_ORIGIN);
  },

  setLocked(pageId, id, locked) {
    get().updateShape(pageId, id, { locked });
  },

  bringToFront(pageId, ids) {
    applyArrange(get, pageId, ids, "front");
  },
  sendToBack(pageId, ids) {
    applyArrange(get, pageId, ids, "back");
  },
  bringForward(pageId, ids) {
    applyArrange(get, pageId, ids, "forward");
  },
  sendBackward(pageId, ids) {
    applyArrange(get, pageId, ids, "backward");
  },
}));

export type ShapeStore = ShapeStoreState;
