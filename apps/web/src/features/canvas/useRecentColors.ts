import { useSyncExternalStore } from "react";

// Recently used ink colors, shared across every color surface (dock picker,
// selection toolbar) and persisted per device. Most-recent-first, deduped.
const KEY = "notux-recent-colors";
const MAX = 8;

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function load(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    /* ignore malformed storage */
  }
  cache = [];
  return cache;
}

function emit() {
  for (const l of listeners) l();
}

export function recordRecentColor(color: string) {
  const hex = color.toLowerCase();
  const next = [color, ...load().filter((c) => c.toLowerCase() !== hex)].slice(
    0,
    MAX,
  );
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  emit();
}

export function useRecentColors(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => [],
  );
}
