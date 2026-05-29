import type { Awareness } from "@notux/sync";
import { useShapeStore } from "../store/shapeStore";

// The active Yjs awareness instance, or null in local-only mode (no realtime).
export function useAwareness(): Awareness | null {
  return useShapeStore((s) => s._awareness);
}
