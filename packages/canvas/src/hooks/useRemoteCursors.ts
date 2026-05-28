import { useMemo, useSyncExternalStore } from "react";
import type { Awareness } from "@notux/sync";

export interface RemoteCursor {
  clientID: number;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selection: string[];
}

const EMPTY: RemoteCursor[] = [];

// Subscribes to awareness and returns every peer's presence (excluding self).
// Uses useSyncExternalStore so React re-renders on awareness "change" events.
export function useRemoteCursors(awareness: Awareness | null): RemoteCursor[] {
  // A per-awareness external store. getSnapshot must return a stable reference
  // between change events, so we keep the computed array in a closure and only
  // recompute when awareness actually fires "change".
  const store = useMemo(() => {
    const compute = (): RemoteCursor[] => {
      if (!awareness) return EMPTY;
      const out: RemoteCursor[] = [];
      awareness.getStates().forEach((state, clientID) => {
        if (clientID === awareness.clientID) return;
        const user = (state.user ?? {}) as { name?: string; color?: string };
        out.push({
          clientID,
          name: user.name ?? "Guest",
          color: user.color ?? "#8e8e93",
          cursor: (state.cursor as { x: number; y: number } | null) ?? null,
          selection: (state.selection as string[]) ?? [],
        });
      });
      return out;
    };

    let snapshot = compute();
    return {
      subscribe(onChange: () => void) {
        if (!awareness) return () => {};
        const handler = () => {
          snapshot = compute();
          onChange();
        };
        awareness.on("change", handler);
        return () => awareness.off("change", handler);
      },
      getSnapshot: () => snapshot,
    };
  }, [awareness]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}
