import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

const _providers = new Map<string, IndexeddbPersistence>();

export function getIndexedDbProvider(
  boardId: string,
  doc: Y.Doc,
): IndexeddbPersistence {
  let provider = _providers.get(boardId);
  if (!provider) {
    provider = new IndexeddbPersistence(`notux-board-${boardId}`, doc);
    _providers.set(boardId, provider);
  }
  return provider;
}
