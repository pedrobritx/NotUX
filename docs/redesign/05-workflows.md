# 5 · Teacher & Student Workflows

The product's identity: **a tutoring whiteboard, not a generic canvas**. The
benchmark products optimise for workshops (Miro/FigJam) or solo notes
(GoodNotes/Notability); NotUX's differentiation is the 1:1 / small-group
live lesson built around documents and ink.

## 5.1 Lesson lifecycle

**Prepare** (teacher, before class)
- Library folders per class/course (shipped); duplicate last week's board as
  a starting point (object duplicate shipped; board duplicate M-B).
- Import textbook PDF / worksheet images / audio (shipped); lay out with
  snapping + align/distribute (shipped); lock the "worksheet" layer of
  objects so students can't move it (lock shipped — *bulk "lock background"
  action* M-D).

**Teach** (live)
- Spotlight mode: students auto-follow the teacher's viewport (shipped);
  any student gesture breaks follow for independent exploration, with the
  Following pill to re-engage (shipped).
- Annotate over content with pen/highlighter; the contextual toolbar keeps
  object fixes (resize, recolor, move) at the selection (shipped).
- **M-F classroom kit** (queued): laser pointer (transient awareness-only
  stroke, auto-fade ~1.5 s); presentation mode (chrome hides except dock
  collapse pill); page-fit "slide" navigation (page = slide); focus mode
  (dim everything except the spotlighted region); lesson timer pill.

**Assign & review** (homework)
- Today: share link + student annotates; snapshots give before/after.
- **M-F homework mode** (queued): teacher marks a board "assignment" →
  each student gets a private copy under the source board; the teacher's
  review view lists copies; a **feedback ink layer** (teacher color locked,
  toggleable) rides on top of student work. This builds on the existing
  snapshot + ownership schema (`boards.owner_id`, `snapshots`).

## 5.2 PDF-centric learning

Current state: PDFs import as per-page raster `asset` shapes (good bones:
lazy rasterisation, storage-backed). Queued design (M-D), synthesising
GoodNotes/Notability/LiquidText:

1. **Annotate-on-document**: imported PDF pages get *Lock to background* by
   default (one tap to undo) so ink lands *over* the page and the page never
   drifts mid-lesson. Ink remains board ink — no PDF mutation — preserving
   multiplayer semantics.
2. **Write-around margin**: the infinite canvas *is* the margin — guidance
   plus snap targets at page edges make "notes beside the page, arrows into
   it" the natural layout (LiquidText's key insight, free on our canvas).
3. **Document navigator**: a popover thumbnail rail per imported document
   (asset pages already know their `pageIndex`) → jump-to-page recenters the
   viewport; large documents stay navigable without scrubbing the canvas.
4. **Anchored notes**: a sticky/text dropped on a page records its parent
   asset id and ships with it when the page is moved/resized (lightweight
   grouping, not a layout engine).
5. **Export round-trip**: existing PDF export already composites ink over
   pages; M-D adds "export this document's pages only".

## 5.3 Multimedia teaching

Shipped: image/PDF/audio import (drag-drop or dock), YouTube/Drive embeds,
all now resizable/movable/lockable with aspect-locked handles; audio/video
play in-place via the HTML overlay. Queued: URL bookmark cards via an
unfurl edge function (M14 in the legacy roadmap), embed registry
generalisation (M15), and "find media" — a board-level media list popover
(M-E) so a teacher can jump to the listening exercise instantly.

## 5.4 Student usage

- **Homework annotation**: open shared board → pen defaults, contextual
  toolbar, snapping — same vocabulary as the teacher's (no separate "student
  UI" to learn).
- **Collaborative notes**: presence cursors + selections (shipped);
  per-author attribution exists on every shape (`author`) → M-F adds an
  author filter ("show only Maria's ink") for review.
- **Revision**: favorites + recents (shipped) make "the board from last
  week" two taps; M-D's document navigator makes "page 34 of the textbook"
  two taps more.

## 5.5 Accessibility & inclusivity (cross-cutting)

- Icon controls all carry labels/tooltips (shipped); contrast-safe states in
  both themes (shipped); reduced-motion honoured (shipped).
- Queued: full keyboard traversal of menus (M-E `Menu` primitive), 44 px
  touch audit on dense popovers (M-G), dyslexia-friendly font option for
  text objects (M-G), captions field on audio embeds (M-G).
