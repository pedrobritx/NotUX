import { create } from "zustand";

function newFolderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return "folder-" + crypto.randomUUID().slice(0, 8);
  }
  return "folder-" + Math.random().toString(36).slice(2, 10);
}

// Local-first board library: Workspace → Folders → Boards. Every board you
// create or open is indexed here (localStorage), with favorites, recents and
// folder assignment. Works identically in local-only and Supabase modes;
// syncing the library server-side is a roadmap item (see docs/redesign).

export interface BoardMeta {
  id: string;
  title: string;
  createdAt: number;
  lastOpenedAt: number;
  starred: boolean;
  folderId: string | null;
}

export interface FolderMeta {
  id: string;
  name: string;
  createdAt: number;
}

interface LibraryState {
  boards: Record<string, BoardMeta>;
  folders: FolderMeta[];

  /** Record a visit (called when a board opens); creates the entry if new. */
  touchBoard(id: string): void;
  renameBoard(id: string, title: string): void;
  toggleStar(id: string): void;
  moveBoard(id: string, folderId: string | null): void;
  /** Forget a board (does not delete its data, just the library entry). */
  removeBoard(id: string): void;

  createFolder(name: string): string;
  renameFolder(id: string, name: string): void;
  /** Delete a folder; its boards move back to the workspace root. */
  deleteFolder(id: string): void;
}

const KEY = "notux-library";

interface Persisted {
  boards?: Record<string, BoardMeta>;
  folders?: FolderMeta[];
}

function load(): { boards: Record<string, BoardMeta>; folders: FolderMeta[] } {
  if (typeof window === "undefined") return { boards: {}, folders: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { boards: {}, folders: [] };
    const v = JSON.parse(raw) as Persisted;
    return { boards: v.boards ?? {}, folders: v.folders ?? [] };
  } catch {
    return { boards: {}, folders: [] };
  }
}

function persist(state: { boards: Record<string, BoardMeta>; folders: FolderMeta[] }) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ boards: state.boards, folders: state.folders }),
    );
  } catch {
    /* storage unavailable */
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  ...load(),

  touchBoard(id) {
    const now = Date.now();
    const existing = get().boards[id];
    const meta: BoardMeta = existing
      ? { ...existing, lastOpenedAt: now }
      : {
          id,
          title: "Untitled board",
          createdAt: now,
          lastOpenedAt: now,
          starred: false,
          folderId: null,
        };
    const boards = { ...get().boards, [id]: meta };
    set({ boards });
    persist({ boards, folders: get().folders });
  },

  renameBoard(id, title) {
    const b = get().boards[id];
    if (!b) return;
    const t = title.trim();
    if (!t) return;
    const boards = { ...get().boards, [id]: { ...b, title: t } };
    set({ boards });
    persist({ boards, folders: get().folders });
  },

  toggleStar(id) {
    const b = get().boards[id];
    if (!b) return;
    const boards = { ...get().boards, [id]: { ...b, starred: !b.starred } };
    set({ boards });
    persist({ boards, folders: get().folders });
  },

  moveBoard(id, folderId) {
    const b = get().boards[id];
    if (!b) return;
    const boards = { ...get().boards, [id]: { ...b, folderId } };
    set({ boards });
    persist({ boards, folders: get().folders });
  },

  removeBoard(id) {
    const boards = { ...get().boards };
    delete boards[id];
    set({ boards });
    persist({ boards, folders: get().folders });
  },

  createFolder(name) {
    const id = newFolderId();
    const folders = [
      ...get().folders,
      { id, name: name.trim() || "New folder", createdAt: Date.now() },
    ];
    set({ folders });
    persist({ boards: get().boards, folders });
    return id;
  },

  renameFolder(id, name) {
    const t = name.trim();
    if (!t) return;
    const folders = get().folders.map((f) => (f.id === id ? { ...f, name: t } : f));
    set({ folders });
    persist({ boards: get().boards, folders });
  },

  deleteFolder(id) {
    const folders = get().folders.filter((f) => f.id !== id);
    const boards = Object.fromEntries(
      Object.entries(get().boards).map(([bid, b]) => [
        bid,
        b.folderId === id ? { ...b, folderId: null } : b,
      ]),
    );
    set({ folders, boards });
    persist({ boards, folders });
  },
}));
