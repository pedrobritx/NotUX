import * as Y from "yjs";

const _docs = new Map<string, Y.Doc>();

export function getBoardDoc(boardId: string): Y.Doc {
  let doc = _docs.get(boardId);
  if (!doc) {
    doc = new Y.Doc();
    _docs.set(boardId, doc);
  }
  return doc;
}
