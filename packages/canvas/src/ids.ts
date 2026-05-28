import { nanoid } from "nanoid";

export function newShapeId(): string {
  return nanoid(12);
}

export function newAuthorId(): string {
  return nanoid(8);
}
