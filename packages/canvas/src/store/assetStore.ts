import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, AssetKind } from "@notux/types";
import { create } from "zustand";
import { newAssetId } from "../ids";
import { uploadAsset, assetPath } from "../assets/storage";
import { screenToWorld, type ViewportState } from "../viewport/Viewport";

export interface AssetDecoded {
  kind: AssetKind;
  pageCount: number | null;
}

interface CanvasInfo {
  viewport: ViewportState;
  size: { w: number; h: number };
  pageId: string;
  authorId: string;
}

interface AssetStoreState {
  // Set by configure() at the Board route. Bytes live in Supabase Storage, so a
  // null client means import is unavailable (local-only mode).
  _boardId: string | null;
  _client: SupabaseClient | null;
  // Latest canvas viewport/size/page/author, pushed by CanvasStage. Used to
  // place button-triggered imports at the current viewport centre.
  _canvas: CanvasInfo | null;
  // Mirror of (_client !== null) so React components can subscribe cheaply.
  canImport: boolean;

  configure(cfg: { boardId: string; client: SupabaseClient | null }): void;
  setCanvasInfo(info: CanvasInfo): void;
  // Upload bytes to Storage + write a best-effort `assets` row, returning the
  // Asset metadata used to build the YAssetRef shape(s).
  ingest(file: File, decoded: AssetDecoded): Promise<Asset>;
  // Import at a specific world point (e.g. a drag-drop location).
  importAt(files: FileList | File[], world: { x: number; y: number }): Promise<void>;
  // Import via the toolbar button: place at the current viewport centre.
  importAtCenter(files: FileList | File[]): Promise<void>;
}

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  _boardId: null,
  _client: null,
  _canvas: null,
  canImport: false,

  configure({ boardId, client }) {
    set({ _boardId: boardId, _client: client, canImport: client !== null });
  },

  setCanvasInfo(info) {
    set({ _canvas: info });
  },

  async ingest(file, decoded) {
    const boardId = get()._boardId;
    const client = get()._client;
    if (!boardId || !client) {
      throw new Error("Import requires Supabase to be configured");
    }
    const assetId = newAssetId();
    await uploadAsset(client, boardId, assetId, file);
    const asset: Asset = {
      id: assetId,
      boardId,
      kind: decoded.kind,
      storagePath: assetPath(boardId, assetId),
      originalFilename: file.name,
      pageCount: decoded.pageCount,
      createdAt: new Date().toISOString(),
    };
    // Best-effort durable record (matches the `assets` table scaffolding).
    // Rendering resolves bytes from the deterministic storage path, so this row
    // is not required for the app to work — swallow failures.
    void client
      .from("assets")
      .insert({
        id: asset.id,
        board_id: asset.boardId,
        kind: asset.kind,
        storage_path: asset.storagePath,
        original_filename: asset.originalFilename,
        page_count: asset.pageCount,
      })
      .then(({ error }) => {
        if (error) console.warn("asset metadata insert failed:", error.message);
      });
    return asset;
  },

  async importAt(files, world) {
    const canvas = get()._canvas;
    if (!canvas) return;
    // Dynamic import keeps the import pipeline (and its lazy pdf.js) out of the
    // store module graph and avoids a static import cycle.
    const { importFiles } = await import("../assets/importFiles");
    await importFiles(files, world, canvas.pageId, canvas.authorId);
  },

  async importAtCenter(files) {
    const canvas = get()._canvas;
    if (!canvas) return;
    const world = screenToWorld(
      canvas.viewport,
      canvas.size.w / 2,
      canvas.size.h / 2,
    );
    await get().importAt(files, world);
  },
}));
