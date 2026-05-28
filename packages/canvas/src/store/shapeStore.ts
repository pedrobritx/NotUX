import type { YShape } from "@notux/types";
import { create } from "zustand";

interface PageShapes {
  // Insertion-ordered map of shapeId -> shape.
  byId: Map<string, YShape>;
}

interface ShapeStoreState {
  // Bumps on every mutation so React selectors that read listShapes re-render.
  revision: number;
  pages: Map<string, PageShapes>;
  _ensurePage(pageId: string): PageShapes;
  _bump(): void;

  listShapes(pageId: string): YShape[];
  getShape(pageId: string, id: string): YShape | undefined;
  addShape(pageId: string, shape: YShape): void;
  updateShape(pageId: string, id: string, patch: Partial<YShape>): void;
  deleteShape(pageId: string, id: string): void;
  deleteShapes(pageId: string, ids: Iterable<string>): void;
  transact(fn: () => void): void;
}

// In-memory store with a surface matching the eventual Yjs binding
// (Y.Map<pageId, Y.Map<shapeId, YShape>>). The Yjs replacement in M3
// implements this same interface, so renderers and tools stay untouched.
export const useShapeStore = create<ShapeStoreState>((set, get) => ({
  revision: 0,
  pages: new Map(),

  _ensurePage(pageId) {
    let page = get().pages.get(pageId);
    if (!page) {
      page = { byId: new Map() };
      get().pages.set(pageId, page);
    }
    return page;
  },

  _bump() {
    set((s) => ({ revision: s.revision + 1 }));
  },

  listShapes(pageId) {
    const page = get().pages.get(pageId);
    if (!page) return [];
    return Array.from(page.byId.values());
  },

  getShape(pageId, id) {
    return get().pages.get(pageId)?.byId.get(id);
  },

  addShape(pageId, shape) {
    const page = get()._ensurePage(pageId);
    page.byId.set(shape.id, shape);
    get()._bump();
  },

  updateShape(pageId, id, patch) {
    const page = get().pages.get(pageId);
    if (!page) return;
    const prev = page.byId.get(id);
    if (!prev) return;
    // Casting through unknown because Partial<YShape> across a discriminated
    // union is wider than the actual variant — callers are responsible for
    // patching with kind-compatible fields.
    page.byId.set(id, { ...prev, ...patch } as unknown as YShape);
    get()._bump();
  },

  deleteShape(pageId, id) {
    const page = get().pages.get(pageId);
    if (!page) return;
    if (page.byId.delete(id)) get()._bump();
  },

  deleteShapes(pageId, ids) {
    const page = get().pages.get(pageId);
    if (!page) return;
    let changed = false;
    for (const id of ids) if (page.byId.delete(id)) changed = true;
    if (changed) get()._bump();
  },

  // M2 stub — Yjs Y.transact wraps the same call in M3.
  transact(fn) {
    fn();
  },
}));

export type ShapeStore = ShapeStoreState;
