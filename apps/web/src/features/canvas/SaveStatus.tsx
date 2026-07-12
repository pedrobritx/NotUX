import { useEffect, useState } from "react";
import { useShapeStore } from "@notux/canvas";

function formatRelative(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// Tracks browser connectivity so the board can tell the user that, while
// offline, edits are still being persisted locally (IndexedDB) and will sync
// when the connection returns.
function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function SaveStatus() {
  const synced = useShapeStore((s) => s.synced);
  const lastSaved = useShapeStore((s) => s.lastSaved);
  const online = useOnline();

  if (!synced) return null;

  const offline = !online;

  return (
    <div
      aria-live="polite"
      className={"save-status" + (offline ? " save-status--offline" : "")}
    >
      {offline
        ? "Offline — saved locally, will sync when reconnected"
        : lastSaved
          ? `Saved ${formatRelative(lastSaved)}`
          : "Saved"}
    </div>
  );
}
