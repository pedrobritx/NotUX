import { useEffect, useState } from "react";
import { loadAssetBitmap, type AssetBitmap } from "../assets/assetLoader";

export type AssetBitmapState =
  | { status: "loading" }
  | { status: "ready"; bitmap: AssetBitmap }
  | { status: "error" };

// Resolve the paintable bitmap for an asset (image) or a specific PDF page.
// Returns a small state machine the AssetRefRenderer maps to a Konva Image or a
// loading/error placeholder.
export function useAssetBitmap(
  assetId: string,
  pageIndex: number | null,
): AssetBitmapState {
  const [state, setState] = useState<AssetBitmapState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadAssetBitmap(assetId, pageIndex)
      .then((bitmap) => {
        if (!cancelled) setState({ status: "ready", bitmap });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, pageIndex]);

  return state;
}
