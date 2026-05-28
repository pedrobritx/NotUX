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
  type Awareness,
} from "@notux/sync";

// Realtime collaboration config, injected by the web app before initBoard.
// Absent (null) in local-only mode (no Supabase env), where the board still
// works fully against IndexedDB.
export interface RealtimeConfig {
  client: SupabaseClient;
  identity: { name: string; color: string };
}

// One promise per boardId — concurrent callers for the same board share the
// same init sequence (handles React StrictMode double-invoke).
const _initPromises = new Map<string, Promise<void>>();

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
        });
        getSupabaseProvider({ client: cfg.client, boardId, doc, awareness });
        set({ _awareness: awareness });
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
    return Array.from(pageMap.values());
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
    doc.transact(() => pageMap.set(shape.id, shape));
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
    doc.transact(() =>
      pageMap.set(id, { ...prev, ...patch } as unknown as YShape),
    );
  },

  deleteShape(pageId, id) {
    const doc = get()._doc;
    if (!doc) return;
    const pageMap = findPageMap(doc, pageId);
    if (!pageMap) return;
    doc.transact(() => pageMap.delete(id));
  },

  deleteShapes(pageId, ids) {
    const doc = get()._doc;
    if (!doc) return;
    const pageMap = findPageMap(doc, pageId);
    if (!pageMap) return;
    doc.transact(() => {
      for (const id of ids) pageMap.delete(id);
    });
  },

  transact(fn) {
    const doc = get()._doc;
    if (!doc) {
      fn();
      return;
    }
    doc.transact(fn);
  },
}));

export type ShapeStore = ShapeStoreState;
