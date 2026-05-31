// A stable, module-level token used as the transaction origin for every
// user-initiated local mutation. The board-wide UndoManager tracks ONLY this
// origin, so remote (SupabaseProvider instance), IndexedDB (its provider), and
// system/migration (null) writes are never captured into a user's undo stack.
//
// A symbol is used rather than a string so it can't collide with a provider
// instance or null, and compares with ===.
export const LOCAL_ORIGIN: symbol = Symbol("notux-local-origin");
