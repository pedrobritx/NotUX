# NotUX Product Redesign

A product-wide UX, UI, and interaction redesign of NotUX — the collaborative
infinite whiteboard for teaching — benchmarked against Apple Freeform, Apple
Notes, GoodNotes, FigJam, Excalidraw, Miro, Notability, LiquidText, and
Concepts, and designed for the platform's real audience: teachers and students
in live online lessons.

This is both a **document set** and a **shipping change set**: the first
implementation tier (foundation fixes + contextual UI + smart alignment +
color/tool simplification + the board library) lands in the same PR that adds
these documents. Everything else is sequenced in the roadmap.

## Documents

| # | Document | Covers deliverable(s) |
|---|----------|------------------------|
| 1 | [UX audit & redundancies](01-ux-audit.md) | UX audit of the current platform; list of redundancies and simplification opportunities |
| 2 | [Information architecture](02-information-architecture.md) | Redesigned information architecture |
| 3 | [Design system](03-design-system.md) | New design system proposal; Apple-inspired visual language guidelines; component inventory |
| 4 | [Interaction specifications](04-interaction-specs.md) | Interaction design specifications |
| 5 | [Teacher & student workflows](05-workflows.md) | Teacher/student workflow improvements; PDF-centric learning; collaboration & online classes |
| 6 | [Benchmark analysis](06-benchmarks.md) | Feature benchmark analysis across nine canvas products |
| 7 | [Implementation roadmap](07-roadmap.md) | Roadmap prioritised by impact and complexity, with what already shipped |

## Design principles (applied throughout)

1. **Minimalist but powerful** — fewer tools, each one deeper. One pen with
   styles beats four pens. One color surface with layers beats three pickers.
2. **Contextual over persistent** — controls appear next to the thing being
   edited and disappear when it isn't. The only persistent chrome is the dock,
   the app menu, and the collaboration bar.
3. **One-click common path** — the colors, widths, and actions used in the
   first minute of a lesson are never more than one tap away; everything else
   sits exactly one disclosure deeper.
4. **Touch- and Pencil-first** — 34–44 px targets, drag affordances, no
   hover-dependent functionality (hover only *adds* affordance).
5. **Physical glass** — translucency, depth, and motion follow one material
   system (`@notux/ui`), not per-component improvisation.
6. **Accessible by default** — contrast-safe hover/active states in both
   themes, focus rings, `prefers-reduced-motion`, ARIA labels and tooltips on
   every icon-only control.

## What shipped with this PR

- **Universal resize/rotate** — every object kind (strokes, stickies,
  polygons, text, images, PDFs, audio/video embeds) gets transform handles;
  lines/arrows get draggable endpoints; media resizes aspect-locked. The
  Transformer had regressed out of the canvas entirely — it is now mounted
  and extended.
- **Smart alignment** — magnetic edge/center snapping with Keynote-style
  guides while dragging, zoom-independent tolerance, Alt to bypass; align and
  distribute commands for multi-selections.
- **Contextual selection toolbar** — replaces the fixed right-edge inspector;
  floats adjacent to the selection, repositions/flips intelligently, shows
  only applicable controls, adds one-click Duplicate / Lock / Delete and an
  Arrange popover.
- **Light-mode hover fix** — active controls no longer vanish on hover; the
  hover/active state system is now contrast-safe by construction (see audit
  §3).
- **Opacity slider fixes** — sliders are bound to their containers, compact,
  and consistent across surfaces.
- **Two-layer color system** — quick layer (curated palette, recents, saved)
  one click away; hex/opacity/eyedropper behind a single disclosure. The
  color wheel is retired (rationale in audit §5).
- **Drawing tool simplification** — Fineliner retired as a separate style
  (it duplicated Pen at a thin width); Pen/Pencil/Marker remain as styles of
  the single pen tool, with back-compat rendering for existing boards.
- **Vector SF Symbols** — the PNG icon masks are replaced by the SVG
  SF Symbols set (normalized onto a uniform optical canvas), with new glyphs
  for align/distribute/duplicate/opacity/library actions.
- **Board library** — Home is now a workspace: folders, favorites, recents,
  search, drag-and-drop filing, inline rename (local-first; server sync is
  roadmap M-B).
