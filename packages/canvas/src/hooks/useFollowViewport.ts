import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect } from "react";
import type { Awareness } from "@notux/sync";
import { useFollowStore } from "../store/followStore";
import { clampScale, type ViewportState } from "../viewport/Viewport";

// A peer's broadcast view: world-space screen centre + scale. Centre-based so
// followers with different window sizes still frame the same content.
export interface AwarenessView {
  cx: number;
  cy: number;
  scale: number;
}

function readView(state: Record<string, unknown> | undefined): AwarenessView | null {
  const v = state?.view as Partial<AwarenessView> | undefined;
  if (
    v &&
    typeof v.cx === "number" &&
    typeof v.cy === "number" &&
    typeof v.scale === "number"
  ) {
    return { cx: v.cx, cy: v.cy, scale: v.scale };
  }
  return null;
}

interface Deps {
  awareness: Awareness | null;
  setViewport: Dispatch<SetStateAction<ViewportState>>;
  sizeRef: RefObject<{ w: number; h: number }>;
}

// Drives follow mode from inside CanvasStage: auto-follows spotlighting peers,
// smoothly tracks the followed peer's broadcast view, and cleans up when the
// presenter stops or disconnects.
export function useFollowViewport({ awareness, setViewport, sizeRef }: Deps) {
  const followingClientID = useFollowStore((s) => s.followingClientID);

  // React to presence changes: grab new spotlights, drop dead follows.
  useEffect(() => {
    if (!awareness) return;
    const check = () => {
      const st = useFollowStore.getState();
      const states = awareness.getStates();

      if (st.followingClientID !== null) {
        const cur = states.get(st.followingClientID);
        const stillSpotlighting = cur?.spotlight === true;
        if (!cur || (st.followReason === "spotlight" && !stillSpotlighting)) {
          st.stopFollowing();
        }
      }

      // A presenter who stopped (or left) gets a clean slate for next time.
      for (const id of st.dismissed) {
        const s = states.get(id);
        if (!s || s.spotlight !== true) st.undismiss(id);
      }

      const after = useFollowStore.getState();
      if (after.followingClientID === null && !after.spotlighting) {
        for (const [clientID, state] of states) {
          if (clientID === awareness.clientID) continue;
          if (state.spotlight === true && !after.dismissed.has(clientID)) {
            after.follow(clientID, "spotlight");
            break;
          }
        }
      }
    };
    awareness.on("change", check);
    check();
    return () => awareness.off("change", check);
  }, [awareness]);

  // Smoothly track the followed peer's view (RAF lerp; snap under
  // prefers-reduced-motion).
  useEffect(() => {
    if (!awareness || followingClientID === null) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      const view = readView(awareness.getStates().get(followingClientID));
      if (view) {
        const size = sizeRef.current ?? { w: 0, h: 0 };
        const scale = clampScale(view.scale);
        const target: ViewportState = {
          scale,
          x: size.w / 2 - view.cx * scale,
          y: size.h / 2 - view.cy * scale,
        };
        setViewport((v) => {
          if (reduced) return target;
          const t = 0.22;
          const next = {
            x: v.x + (target.x - v.x) * t,
            y: v.y + (target.y - v.y) * t,
            scale: v.scale + (target.scale - v.scale) * t,
          };
          const settled =
            Math.abs(next.x - target.x) < 0.5 &&
            Math.abs(next.y - target.y) < 0.5 &&
            Math.abs(next.scale - target.scale) < 0.001;
          return settled ? target : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [awareness, followingClientID, setViewport, sizeRef]);
}
