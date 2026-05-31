import * as Y from "yjs";
import type { YShape } from "@notux/types";
import { LOCAL_ORIGIN } from "./origin";

// Encode the full board state (all pages + the page list) as a single Yjs
// update. Stored verbatim as the `ydoc bytea` of a named snapshot row.
export function encodeSnapshot(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

// Overwrite the live doc's board state (pages + pageList) with a snapshot's, in
// ONE LOCAL_ORIGIN transaction so it (a) propagates to peers via the provider's
// update handler — which only suppresses its own origin — and (b) lands as a
// single undoable step.
//
// Shapes live as plain JS objects in the model (pageMap.set(id, shape)), so they
// are read back with a shallow copy and re-set. Page-list entries are rebuilt as
// fresh Y.Maps — a Y type can't be moved between docs.
export function restoreSnapshot(liveDoc: Y.Doc, snapshotBytes: Uint8Array): void {
  const temp = new Y.Doc();
  Y.applyUpdate(temp, snapshotBytes);

  const tempPages = temp.getMap<Y.Map<YShape>>("pages");
  const tempList = temp.getArray<Y.Map<string>>("pageList");

  const plainPages: Array<[string, YShape[]]> = [];
  for (const [pageId, pageMap] of tempPages.entries()) {
    plainPages.push([
      pageId,
      Array.from(pageMap.values()).map((s) => ({ ...s })),
    ]);
  }
  const plainList = tempList.toArray().map((m) => ({
    id: m.get("id") ?? "",
    title: m.get("title") ?? "Page",
  }));
  temp.destroy();

  const livePages = liveDoc.getMap<Y.Map<YShape>>("pages");
  const liveList = liveDoc.getArray<Y.Map<string>>("pageList");

  liveDoc.transact(() => {
    for (const key of Array.from(livePages.keys())) livePages.delete(key);
    if (liveList.length > 0) liveList.delete(0, liveList.length);

    for (const [pageId, shapes] of plainPages) {
      const pm = new Y.Map<YShape>();
      for (const s of shapes) pm.set(s.id, s);
      livePages.set(pageId, pm);
    }
    for (const entry of plainList) {
      if (!entry.id) continue;
      const m = new Y.Map<string>();
      m.set("id", entry.id);
      m.set("title", entry.title);
      liveList.push([m]);
    }
  }, LOCAL_ORIGIN);
}
