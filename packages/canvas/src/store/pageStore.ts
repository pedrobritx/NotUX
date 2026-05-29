import type * as Y from "yjs";
import { create } from "zustand";
import {
  getBoardDoc,
  getPageList,
  readPageList,
  ensureSeedPage,
  addPageEntry,
  removePageEntry,
  renamePageEntry,
  movePageEntry,
} from "@notux/sync";
import { newPageId } from "../ids";

export const DEFAULT_PAGE_ID = "page-0";

export interface PageMeta {
  id: string;
  title: string;
}

interface PageStoreState {
  // Bumps on every page-list mutation so React selectors re-render.
  revision: number;
  _doc: Y.Doc | null;
  _unobserve: (() => void) | null;
  // The ordered, synced list of pages.
  pages: PageMeta[];
  // The page this client is viewing. LOCAL per-user — never written to Yjs.
  activePageId: string;
  _bump(): void;

  // Bind to a board's Yjs doc and seed/migrate the page list. Idempotent per
  // board (handles StrictMode double-invoke). Call after shapeStore.initBoard
  // has resolved so the doc is hydrated from IndexedDB first.
  initPages(boardId: string): void;

  addPage(): string;
  deletePage(id: string): void;
  renamePage(id: string, title: string): void;
  reorderPage(fromIdx: number, toIdx: number): void;
  setActivePage(id: string): void;
}

export const usePageStore = create<PageStoreState>((set, get) => ({
  revision: 0,
  _doc: null,
  _unobserve: null,
  pages: [{ id: DEFAULT_PAGE_ID, title: "Page 1" }],
  activePageId: DEFAULT_PAGE_ID,

  _bump() {
    set((s) => ({ revision: s.revision + 1 }));
  },

  initPages(boardId) {
    const doc = getBoardDoc(boardId);
    // Already bound to this board's doc — nothing to do.
    if (get()._doc === doc) return;
    get()._unobserve?.();

    ensureSeedPage(doc, DEFAULT_PAGE_ID);
    const list = getPageList(doc);

    const refresh = () => {
      const pages = readPageList(doc);
      set((s) => {
        const valid = pages.some((p) => p.id === s.activePageId);
        return {
          pages,
          activePageId: valid
            ? s.activePageId
            : (pages[0]?.id ?? DEFAULT_PAGE_ID),
        };
      });
      get()._bump();
    };

    const handler = () => refresh();
    list.observeDeep(handler);
    set({ _doc: doc, _unobserve: () => list.unobserveDeep(handler) });
    refresh();
  },

  addPage() {
    const doc = get()._doc;
    if (!doc) return DEFAULT_PAGE_ID;
    const id = newPageId();
    addPageEntry(doc, id, `Page ${get().pages.length + 1}`);
    return id;
  },

  deletePage(id) {
    const doc = get()._doc;
    if (!doc) return;
    const pages = get().pages;
    if (pages.length <= 1) return; // keep at least one page
    const idx = pages.findIndex((p) => p.id === id);
    const neighbor =
      pages[idx + 1]?.id ??
      pages[idx - 1]?.id ??
      pages[0]?.id ??
      DEFAULT_PAGE_ID;
    removePageEntry(doc, id);
    if (get().activePageId === id) set({ activePageId: neighbor });
  },

  renamePage(id, title) {
    const doc = get()._doc;
    if (!doc) return;
    renamePageEntry(doc, id, title || "Page");
  },

  reorderPage(fromIdx, toIdx) {
    const doc = get()._doc;
    if (!doc) return;
    movePageEntry(doc, fromIdx, toIdx);
  },

  setActivePage(id) {
    set({ activePageId: id });
  },
}));
