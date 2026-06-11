# 6 · Benchmark Analysis

Nine products evaluated on the axes that matter for a teaching whiteboard.
"→ NotUX" = what we adopt (or deliberately reject).

## Apple Freeform
- **Toolbar**: single bottom dock, ~7 items; everything else contextual.
- **Objects**: universal resize handles, aspect-locked media, alignment
  guides, inline contextual menu on selection.
- **IA**: flat board list + favorites/recents/shared smart views.
- → **Adopted heavily**: contextual selection toolbar, universal transform,
  guide behaviour, "views not places" library, locked→Unlock-only
  affordance. Rejected: Freeform's shape *library* breadth (hundreds of
  clipart shapes) — out of scope for v1; 9 shape primitives suffice.

## Apple Notes (iPadOS)
- **Tool palette**: instruments with per-instrument memory, width via
  preset dots, tap-active-tool-for-options. Quick 6-color row + wheel
  behind it.
- → **Adopted**: instrument memory (already shipped in dockStore), tap-again
  for options, quick palette + disclosure model. Rejected: the color wheel
  (audit §5) and the ruler (snapping + shift-constrain cover the classroom
  cases).

## GoodNotes / Notability
- **PDF**: page-anchored ink, document thumbnails, lasso everything;
  Notability's audio-synced notes are beloved for revision.
- **IA**: folders → notebooks with visual covers; favorites.
- → **Adopted**: folder library with counts (shipped), document navigator +
  page-anchored annotation design (M-D), audio-on-board as first-class
  (already shipped via embeds; sync-to-ink is a far-future idea, not
  roadmapped — heavy and patent-adjacent).

## LiquidText
- **Killer pattern**: document + infinite workspace beside it; excerpts
  linked back to source pages.
- → **Adopted as stance**: NotUX's PDF pages live *on* the canvas, so
  "write around the document" is native. Excerpt-link-back is M-D's
  anchored-notes lite; full citation linking rejected (research tool, not
  lesson tool).

## FigJam
- **Contextual property bar above selection** — the closest analogue to our
  new SelectionToolbar; snap + smart gap matching; cursor chat & stamps.
- → **Adopted**: toolbar placement/flip behaviour, snap feel (8 px,
  zoom-independent), align/distribute set. Queued: gap matching (M-C).
  Stamps/reactions considered for M-F (lightweight feedback in lessons).

## Miro
- Deep facilitation kit (voting, timers, frames, presentation paths).
- → **Adopted selectively**: timer + presentation flow land in M-F as
  lesson-shaped features. Rejected: frames-as-sections, template
  marketplace, app ecosystem — complexity NotUX exists to avoid.

## Excalidraw
- Minimal tool count, keyboard-first, hand-drawn aesthetic, local-first.
- → **Adopted**: tool minimalism bar (every dock item must defend itself),
  Alt-to-bypass-snap, local-first library ethos (shipped). Rejected: the
  sketchy rendering style (wrong tone for textbook annotation).

## Concepts
- Infinite *vector* ink with per-stroke editability, tool wheel.
- → **Adopted**: stroke transformability (shipped — strokes scale/rotate as
  real geometry). Rejected: the radial tool wheel (expert-niche, poor
  discoverability for students).

## Synthesis — where NotUX positions
| Axis | Position |
|---|---|
| Tool count | Excalidraw-minimal (10 dock items incl. chrome) |
| Object manipulation | Freeform-grade handles + FigJam-grade snapping |
| Color | Notes-style quick layer, no wheel |
| IA | GoodNotes folders × Freeform smart views |
| Collaboration | spotlight/follow now; lesson kit (M-F) is the moat |
| PDF | GoodNotes annotation comfort on a LiquidText-style canvas (M-D) |
