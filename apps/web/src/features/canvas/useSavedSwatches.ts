import { useCallback, useEffect, useState } from "react";

const KEY = "notux-swatches";
const DEFAULTS = ["#000000", "#0a84ff", "#34c759", "#ffd60a", "#ff453a"];
const MAX = 12;

/** Persisted recently-saved color swatches (localStorage). */
export function useSavedSwatches() {
  const [swatches, setSwatches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          return parsed;
        }
      }
    } catch {
      /* ignore malformed storage */
    }
    return DEFAULTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(swatches));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [swatches]);

  const addSwatch = useCallback((color: string) => {
    setSwatches((prev) => {
      const hex = color.toLowerCase();
      if (prev.some((s) => s.toLowerCase() === hex)) return prev;
      return [...prev, color].slice(-MAX);
    });
  }, []);

  return { swatches, addSwatch };
}
