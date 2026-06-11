# 7 · Implementation Roadmap

Sequenced by **impact ÷ complexity** for the teaching use case. M-A shipped
with this PR; M11/M12/M14–M16 from `docs/ROADMAP.md` remain valid and are
slotted where they pay off most. Each tier is independently shippable.

## M-A — Foundation tier ✅ (this PR)

| Item | Impact | Complexity |
|---|---|---|
| Mount + universalise transform (all kinds, aspect-locked media, stroke baking, endpoint handles) | ★★★★★ | M |
| Magnetic snapping + guides + align/distribute | ★★★★★ | M |
| Contextual selection toolbar (replaces fixed inspector) | ★★★★★ | M |
| Light-mode hover/active contrast system (`--accent-hover`, paired rules) | ★★★★ | S |
| Opacity slider containment + unification | ★★★ | S |
| Two-layer color picker + recents | ★★★★ | S |
| Pen style dedup (retire Fineliner from picker) | ★★ | S |
| Vector SF Symbols (normalized SVG masks) + new glyphs | ★★★ | S |
| Board library: folders/favorites/recents/search/drag-to-file (local-first) | ★★★★★ | M |

## M-B — Library sync & board identity (next)

Server-side `folders` table, `boards.{folder_id,starred,last_opened_at,archived_at}`,
RLS owner-scoped; Home merges server boards with local visits; board title
unified onto `boards.title` (AppMenu shows board, page tray shows pages);
board duplicate; archive view. *Impact ★★★★ · Complexity M (migration +
merge logic).*

## M-C — Manipulation polish

Resize-time snapping; equal-gap (spacing-match) suggestions; auto-pan while
dragging at viewport edges; ⌘D duplicate + arrow-key nudge; multi-line
endpoint editing. Fold in legacy **M11 native ink feel** (coalesced events,
wet-ink layer, palm rejection) and **M12 rbush culling** — manipulation and
ink quality are one perceived feature. *Impact ★★★★ · Complexity M–L.*

## M-D — PDF-centric learning

Lock-to-background default for imported pages; document navigator popover
(per-asset page thumbnails → recenter); anchored notes (sticky/text records
parent asset); bulk "lock background"; export-this-document. Verify lazy
per-page rasterisation (legacy M14 item). *Impact ★★★★★ for the audience ·
Complexity L.*

## M-E — Chrome consolidation & input breadth

Single board menu replacing File/Edit/View/Arrange text bar (icon trigger,
sections: Board · Insert · View · Share); one insert surface (dock ＋ menu
merge); zoom pill with fit-to-content; tool shortcuts + `?` overlay; `Menu`
/`Dialog`/`Toast`/rich `Tooltip` primitives; Liquid Glass bevel tier; prune
dead picker CSS; media list popover. *Impact ★★★ · Complexity M.*

## M-F — Classroom kit (the moat)

Laser pointer (awareness-only fading stroke); presentation mode + page-fit
navigation; focus mode; lesson timer; homework mode (per-student board
copies + teacher review list); teacher feedback layer; author ink filter;
stamps/reactions. Builds on existing spotlight/follow/awareness plumbing.
*Impact ★★★★★ differentiation · Complexity L (homework mode is the long
pole).*

## M-G — Platform & inclusivity

PWA manifest + offline (legacy M16), Capacitor wrappers; embed registry
(legacy M15) + URL unfurl cards (legacy M14); 44 px touch audit; dyslexia-
friendly font option; audio captions; keyboard-traversable menus.
*Impact ★★★ · Complexity M–L.*

## Sequencing logic

1. **M-A before everything**: no amount of feature work matters while
   objects can't be resized and controls fight their own hover states.
2. **M-B second**: the library is only half-real until it survives device
   changes for signed-in teachers.
3. **M-C/M-D interleave** by team shape (canvas-engine vs. product work).
4. **M-F after M-D**: lesson tooling presumes documents behave.
5. **M-G continuous**: platform items ride along where convenient (the PWA
   manifest is one afternoon and should not wait for its tier).
