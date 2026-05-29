import { nanoid } from "nanoid";

export function newShapeId(): string {
  return nanoid(12);
}

export function newAuthorId(): string {
  return nanoid(8);
}

export function newAssetId(): string {
  return nanoid(12);
}
