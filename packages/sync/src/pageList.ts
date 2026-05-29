import * as Y from "yjs";

// The ordered list of pages lives in a Y.Array("pageList") of small Y.Maps
// ({ id, title }), separate from the per-page shape maps in getMap("pages").
// Array order == page order. Shapes for a page id keep living under
// getMap("pages").get(id) (see pageMap.ts) — this list just names and orders
// them so create / rename / delete / reorder sync across clients.

export interface PageEntry {
  id: string;
  title: string;
}

export function getPageList(doc: Y.Doc): Y.Array<Y.Map<string>> {
  return doc.getArray<Y.Map<string>>("pageList");
}

function makeEntry(id: string, title: string): Y.Map<string> {
  const m = new Y.Map<string>();
  m.set("id", id);
  m.set("title", title);
  return m;
}

export function readPageList(doc: Y.Doc): PageEntry[] {
  return getPageList(doc)
    .toArray()
    .map((m) => ({ id: m.get("id") ?? "", title: m.get("title") ?? "Page" }))
    .filter((p) => p.id !== "");
}

/**
 * Seed the page list on first run. Idempotent: a no-op once the list is
 * populated. Migrates existing boards (whose shapes already live under one or
 * more page ids in getMap("pages")) by listing those ids so their content
 * stays selectable; otherwise creates a single fresh page with `seedId`.
 */
export function ensureSeedPage(
  doc: Y.Doc,
  seedId: string,
  seedTitle = "Page 1",
): void {
  const list = getPageList(doc);
  if (list.length > 0) return;
  doc.transact(() => {
    if (list.length > 0) return; // guard against a racing transaction
    const existingIds = Array.from(
      doc.getMap<unknown>("pages").keys(),
    );
    if (existingIds.length === 0) {
      list.push([makeEntry(seedId, seedTitle)]);
      return;
    }
    const ordered = existingIds.includes(seedId)
      ? [seedId, ...existingIds.filter((id) => id !== seedId)]
      : existingIds;
    list.push(ordered.map((id, i) => makeEntry(id, `Page ${i + 1}`)));
  });
}

export function addPageEntry(doc: Y.Doc, id: string, title: string): void {
  doc.transact(() => getPageList(doc).push([makeEntry(id, title)]));
}

export function removePageEntry(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    const list = getPageList(doc);
    const idx = list.toArray().findIndex((m) => m.get("id") === id);
    if (idx >= 0) list.delete(idx, 1);
    // Drop the page's shapes too.
    doc.getMap<unknown>("pages").delete(id);
  });
}

export function renamePageEntry(doc: Y.Doc, id: string, title: string): void {
  doc.transact(() => {
    const list = getPageList(doc);
    for (let i = 0; i < list.length; i++) {
      const m = list.get(i);
      if (m.get("id") === id) {
        m.set("title", title);
        return;
      }
    }
  });
}

export function movePageEntry(doc: Y.Doc, fromIdx: number, toIdx: number): void {
  doc.transact(() => {
    const list = getPageList(doc);
    if (fromIdx < 0 || fromIdx >= list.length) return;
    const m = list.get(fromIdx);
    const id = m.get("id") ?? "";
    const title = m.get("title") ?? "Page";
    list.delete(fromIdx, 1);
    const insertAt = Math.max(0, Math.min(toIdx, list.length));
    list.insert(insertAt, [makeEntry(id, title)]);
  });
}
