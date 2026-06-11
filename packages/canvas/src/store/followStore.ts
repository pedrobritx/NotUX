import { create } from "zustand";

// Spotlight / follow-mode state (FigJam-style). One peer "spotlights" and
// broadcasts their viewport via awareness; everyone else auto-follows until
// they interact with the canvas (pan/zoom/draw) or tap the follow pill.
// Clicking a peer's avatar follows them manually, spotlight or not.
interface FollowStoreState {
  // The awareness clientID being followed, or null.
  followingClientID: number | null;
  // How the follow started: spotlight follows end when the presenter stops;
  // manual follows persist until the user breaks away or the peer leaves.
  followReason: "spotlight" | "manual" | null;
  // True while the local user is presenting.
  spotlighting: boolean;
  // Presenters this user broke away from — don't auto re-grab until they
  // re-toggle their spotlight.
  dismissed: Set<number>;

  follow(clientID: number, reason: "spotlight" | "manual"): void;
  stopFollowing(dismiss?: boolean): void;
  setSpotlighting(on: boolean): void;
  undismiss(clientID: number): void;
}

export const useFollowStore = create<FollowStoreState>((set, get) => ({
  followingClientID: null,
  followReason: null,
  spotlighting: false,
  dismissed: new Set<number>(),

  follow(clientID, reason) {
    const dismissed = new Set(get().dismissed);
    dismissed.delete(clientID);
    set({
      followingClientID: clientID,
      followReason: reason,
      spotlighting: false,
      dismissed,
    });
  },

  stopFollowing(dismiss = false) {
    const { followingClientID, dismissed } = get();
    const next = new Set(dismissed);
    if (dismiss && followingClientID !== null) next.add(followingClientID);
    set({ followingClientID: null, followReason: null, dismissed: next });
  },

  setSpotlighting(on) {
    // Presenting and following are mutually exclusive.
    set(
      on
        ? { spotlighting: true, followingClientID: null, followReason: null }
        : { spotlighting: false },
    );
  },

  undismiss(clientID) {
    const next = new Set(get().dismissed);
    next.delete(clientID);
    set({ dismissed: next });
  },
}));
