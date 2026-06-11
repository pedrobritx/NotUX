import { create } from "zustand";

// Local per-device view preferences (never synced).
interface PrefsStoreState {
  showRemoteCursors: boolean;
  setShowRemoteCursors(v: boolean): void;
}

const PERSIST_KEY = "notux-prefs";

function loadPersisted(): { showRemoteCursors: boolean } {
  if (typeof window === "undefined") return { showRemoteCursors: true };
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return { showRemoteCursors: true };
    const v = JSON.parse(raw) as { showRemoteCursors?: boolean };
    return { showRemoteCursors: v.showRemoteCursors !== false };
  } catch {
    return { showRemoteCursors: true };
  }
}

export const usePrefsStore = create<PrefsStoreState>((set) => ({
  ...loadPersisted(),
  setShowRemoteCursors(v) {
    set({ showRemoteCursors: v });
    try {
      window.localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({ showRemoteCursors: v }),
      );
    } catch {
      /* storage unavailable */
    }
  },
}));
