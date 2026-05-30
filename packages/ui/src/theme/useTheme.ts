import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "notux-theme";

// Module-level store so every `useTheme` consumer stays in sync without a
// React context provider (the app has none). Listeners are notified on change.
let current: Theme = readInitial();
const listeners = new Set<() => void>();

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Default to the light, FigJam-like look; users can switch via the menu.
  return "light";
}

/** Resolve the theme the app should boot with (stored pref → OS preference). */
export function getInitialTheme(): Theme {
  return readInitial();
}

/** Reflect a theme onto the document so the CSS `[data-theme]` tokens apply. */
export function applyTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

function setThemeInternal(theme: Theme): void {
  current = theme;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface UseThemeResult {
  theme: Theme;
  setTheme(theme: Theme): void;
  toggle(): void;
}

export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
  return {
    theme,
    setTheme: setThemeInternal,
    toggle: () => setThemeInternal(current === "dark" ? "light" : "dark"),
  };
}
