import * as Y from "yjs";
import type { YShape } from "@notux/types";

/** Returns the page's Y.Map if it exists, or null (no write). */
export function findPageMap(
  doc: Y.Doc,
  pageId: string,
): Y.Map<YShape> | null {
  return doc.getMap<Y.Map<YShape>>("pages").get(pageId) ?? null;
}

/** Returns the page's Y.Map, creating it inside a transaction if absent. */
export function getPageMap(doc: Y.Doc, pageId: string): Y.Map<YShape> {
  const pages = doc.getMap<Y.Map<YShape>>("pages");
  const existing = pages.get(pageId);
  if (existing) return existing;

  const pageMap = new Y.Map<YShape>();
  doc.transact(() => pages.set(pageId, pageMap));
  return pageMap;
}
