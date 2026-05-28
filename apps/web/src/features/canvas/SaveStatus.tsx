import { useShapeStore } from "@notux/canvas";

function formatRelative(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function SaveStatus() {
  const synced = useShapeStore((s) => s.synced);
  const lastSaved = useShapeStore((s) => s.lastSaved);

  if (!synced) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        padding: "4px 10px",
        borderRadius: 8,
        background: "rgba(30,30,30,0.75)",
        backdropFilter: "blur(8px)",
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 20,
      }}
    >
      {lastSaved ? `Saved ${formatRelative(lastSaved)}` : "Saved"}
    </div>
  );
}
