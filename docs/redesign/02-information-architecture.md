# 2 · Information Architecture

## The hierarchy

```
Workspace (you)
├── Favorites            (pinned cross-cutting view)
├── Recents              (automatic, last-opened order)
├── Folders              ("Year 9 English", "ESL Content", …)
│   └── Boards
├── Boards               (unfiled, workspace root)
└── Archive              (roadmap M-B: out of sight, never deleted)

Board
├── Pages                (ordered, renameable — the existing page tray)
│   └── Objects          (ink, text, stickies, shapes, media, PDF pages)
└── Board settings       (background, grid, sharing, snapshots)
```

This matches the model teachers already hold from GoodNotes (folders →
notebooks → pages) and Freeform (boards list → board), with one deliberate
difference: **Favorites and Recents are views, not places**. A board lives in
exactly one folder (or the root); starring or opening it never moves it.

## Home (the workspace) — shipped

`apps/web/src/routes/Home.tsx` + `features/library/libraryStore.ts`:

- **Top bar**: workspace identity, search (filters all boards by title,
  flat results), theme toggle, New folder, New board.
- **Sections** in order: Favorites (only if any), Recents (last 6), Folders
  (cards with board counts), Boards (unfiled).
- **Folder view**: tap a folder card → its boards + rename/delete controls;
  "New board" inside a folder files the new board there.
- **Card affordances**: open on tap; star toggle; ⋯ menu (rename, move to
  folder, move to workspace, remove from library); **drag a board card onto
  a folder card to file it** — same gesture as iPadOS Files.
- **Empty state**: a single clear call to action; the library teaches itself
  as entries appear automatically when boards are created or visited.

### Local-first by design

The library indexes in `localStorage` (`notux-library`), so it works
identically in local-only mode and Supabase mode, including for boards you
visited via a shared link but don't own. Roadmap **M-B** adds the
authoritative server layer for signed-in users:

- `folders(id, owner_id, name, created_at)` + `boards.folder_id`,
  `boards.starred`, `boards.last_opened_at`, `boards.archived_at`
- Home merges: server boards (owned) ∪ local visits (shared/anonymous),
  server wins for titles; the board's title becomes the `boards.title`
  column everywhere (fixing the page-title/board-title conflation in
  `AppMenu`).
- Shared-with-me section sourced from boards the user opened that are owned
  by someone else.

## Inside a board

Persistent chrome is capped at **three regions** (plus the save status pill):

| Region | Contents | Rationale |
|---|---|---|
| Top-left `AppMenu` | board menu, page switcher | navigation + rare commands |
| Top-center `Dock` | tools, color, insert | the only always-needed surface |
| Top-right `CollabBar` | presence, share, spotlight | collaboration is glanceable |

Everything else is **contextual**: selection toolbar by the selection, text
toolbar by the text caret, popovers off their buttons. Nothing else may be
permanently pinned to an edge — that rule is what keeps the canvas feeling
infinite on an 11″ iPad.

Pages stay a flat ordered list per board (the current model). Sections
within pages are intentionally **not** added: for lesson flows, multiple
pages + folders cover the organisational need with one less concept; the
benchmark products that added section trees (Miro frames-as-pages, OneNote)
pay for it with a second navigation surface.
