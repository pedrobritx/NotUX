export type AssetKind = "pdf" | "image" | "audio";

export interface Asset {
  id: string;
  boardId: string;
  kind: AssetKind;
  storagePath: string;
  originalFilename: string;
  pageCount: number | null;
  createdAt: string;
}
