import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, AssetKind, YEmbed } from "@notux/types";
import { create } from "zustand";
import { newAssetId, newShapeId } from "../ids";
import { uploadAsset, assetPath } from "../assets/storage";
import { parseEmbedUrl } from "../assets/embeds";
import { useShapeStore } from "./shapeStore";
import { useToolStore } from "./toolStore";
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
  // Insert a YouTube/Google Drive embed from a pasted URL at the viewport
  // centre. Returns an error message when the URL can't be parsed, else null.
  insertEmbed(rawUrl: string): string | null;
}

// Default card sizes (world units) per embed provider.
const YT_EMBED_W = 480;
const YT_EMBED_H = 270; // 16:9
const DRIVE_EMBED_W = 420;
const DRIVE_EMBED_H = 120;

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

  insertEmbed(rawUrl) {
    const canvas = get()._canvas;
    if (!canvas) return "Canvas is not ready";
    const parsed = parseEmbedUrl(rawUrl);
    if (!parsed) return "Unrecognised URL — paste a YouTube or Google Drive link";
    const world = screenToWorld(
      canvas.viewport,
      canvas.size.w / 2,
      canvas.size.h / 2,
    );
    const w = parsed.embedType === "youtube" ? YT_EMBED_W : DRIVE_EMBED_W;
    const h = parsed.embedType === "youtube" ? YT_EMBED_H : DRIVE_EMBED_H;
    const shape: YEmbed = {
      id: newShapeId(),
      author: canvas.authorId,
      kind: "embed",
      embedType: parsed.embedType,
      url: parsed.url,
      title: parsed.embedType === "youtube" ? "YouTube" : "Google Drive",
      x: world.x - w / 2,
      y: world.y - h / 2,
      w,
      h,
      rot: 0,
    };
    const store = useShapeStore.getState();
    store.transact(() => store.addShape(canvas.pageId, shape));
    useToolStore.getState().setSelection([shape.id]);
    return null;
  },
}));
