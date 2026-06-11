# 1 · UX Audit & Redundancy Analysis

Audit of the product as found at commit `b358df2`, file-level evidence
included. Items marked ✅ are fixed in the redesign PR that adds this
document; the rest are sequenced in [the roadmap](07-roadmap.md).

## 1. Object manipulation

### 1.1 No resize handles anywhere ✅
`TransformLayer` existed (`packages/canvas/src/layers/TransformLayer.tsx`)
but was **imported and never mounted** in `CanvasStage.tsx`; the computed
`overlayShapes` list was also unused, and the dashed selection box was drawn
for the *entire* selection. Net effect: no object on the board — image, PDF,
video, sticky, shape, or text — could be resized or rotated at all. This is
the single largest capability gap versus every benchmarked product.

Even when mounted, the old transformer covered only `rect/ellipse/text/
asset/embed`. Polygon, sticky, and stroke were move-only, and line/arrow had
no way to edit endpoints after creation.

**Fix shipped:** transformer mounted; all kinds transformable (strokes bake
the node's affine transform into their points and scale brush size; stickies
scale their type with the note; media is aspect-locked); lines/arrows get
Freeform-style draggable endpoint dots with 45° shift-constrain.

### 1.2 No alignment assistance ✅
`SelectTool.ts` translated shapes raw — no snapping, no guides, no align or
distribute commands anywhere in the product. For a teaching tool whose boards
are full of labelled diagrams and worksheet layouts, this made tidy layout
nearly impossible.

**Fix shipped:** magnetic edge/center snapping with guide lines
(`tools/snapping.ts`), align/distribute commands (`tools/alignOps.ts`)
surfaced in the selection toolbar's Arrange popover. Equal-gap (spacing
match) snapping is roadmap M-C.

## 2. Global vs. contextual controls

### 2.1 The fixed right-edge inspector ✅
`SelectionInspector` rendered as a 200 px panel pinned to the right edge,
vertically centered (`apps/web/src/styles.css .selection-inspector`),
regardless of where the selection was. On an iPad in landscape the cursor/
finger travel from a selected sticky at the left edge to its color control
was the full width of the screen. It also occluded canvas content and
appeared even for single tiny objects.

**Fix shipped:** contextual `SelectionToolbar` floating 12 px above the
selection (below when the dock would occlude it), horizontally clamped,
icon-first with popovers for detail. Locked selections collapse to a single
"Unlock" affordance, as in Freeform.

### 2.2 Hidden commands
Z-order, lock, delete, select-all live only in the `AppMenu` text menus
(`File/Edit/View/Arrange`) and keyboard shortcuts. The Arrange menu
duplicates the inspector's z-order buttons — two homes for the same four
commands, neither discoverable on touch. The selection toolbar now carries
these; the desktop-style text menu bar itself is queued for consolidation
into a single board menu (roadmap M-E) since persistent `File Edit View
Arrange` reads as a desktop app, not a touch-first canvas.

## 3. Hover states (light mode) ✅

The defect class: generic `:hover` rules carry specificity (0,2,0) while
`--active` modifier classes carry (0,1,0), so **hover always overrode
active backgrounds**. In dark mode `--glass-hover` is translucent white over
a dark dock — the white active glyph survives. In light mode `--glass-hover`
is `rgba(255,255,255,0.8)`: hovering the active Pen painted a near-white pill
under the active state's *white* icon → the icon disappeared (the reported
bug, reproduced from `packages/ui/src/styles.css`).

The same collision existed for `.glass-button--active`, `.width-preset--active`
(white squiggle on near-white), `.brush-style--active`, `.menu__grid-btn--active`,
`.text-toolbar__btn--active`, and `.collab-bar__btn--active`.

**Fix shipped:** an `--accent-hover` token plus explicit `--active:hover`
rules so active surfaces brighten *within* the accent ramp instead of
falling back to the glass hover wash. Hover is now additive (it never
reduces contrast), satisfying WCAG 1.4.11 for these states in both themes.

## 4. Opacity controls ✅

- `Slider` had no `min-width: 0` and a 64 px value box at 17 px type: inside
  the 280 px mini color picker (or a 320 px phone), the row overflowed its
  popover.
- The selection inspector used a **native `<input type=range>`** while the
  dock used the custom `Slider` — two different opacity controls with
  different geometry and theming.

**Fix shipped:** slider flexes within any container (`min-width: 0`, compact
tabular-numeral value box); both surfaces now use the same `Slider` in the
checkerboard "opacity" variant.

## 5. Color system redundancies ✅

Three color surfaces, three behaviours:

| Surface | Palette | Recents | Saved | Hex | Opacity | Eyedropper |
|---|---|---|---|---|---|---|
| Dock `ColorPicker` | 14 | — | ✓ (flat row) | always visible | always visible | ✓ |
| `SelectionInspector` color row | 14 | — | — | — | native range | — |
| Sticky color popover | 5 | — | — | — | — | — |

Findings:

- **Is the color wheel necessary? No.** There was no wheel in the shipped
  code (a grid + sliders variant existed as dead CSS, `.color-grid` /
  `.color-sliders`); benchmarks (Notes, Freeform quick palette, FigJam)
  show curated palettes + recents + eyedropper + hex cover the real
  distribution of teacher color choices. A wheel optimises for precision
  nobody asked for and costs a full extra surface. Dead picker CSS should be
  pruned with the menu consolidation (M-E).
- **Recents were missing entirely** — the highest-leverage one-click layer.
- Hex/opacity were *always* expanded, pushing swatches up and making the
  common path (tap a color) compete with the rare path.

**Fix shipped:** one two-layer model used by both the dock picker and the
selection toolbar: quick layer = curated 14 + Recent (auto-tracked,
device-local) + Saved; advanced layer behind a single "More" disclosure =
hex, opacity, save-color. Eyedropper stays in the header (it *is* a quick
action). Sticky colors stay a 5-chip popover — task-specific palettes are a
feature, not a redundancy.

## 6. Drawing tools ✅

`PEN_STYLES` exposed four pen-family styles — pen, fineliner, pencil, marker
— next to five width presets and an opacity slider (`dockStore.ts`).
Fineliner = pen with `width: 2`; it differed by no other rendering property
(`strokeGeometry.ts` treats them identically). Marker and pen differ in cap
and default width; pencil has texture. So exactly one style was pure
redundancy.

**Fix shipped:** Fineliner removed from the picker (kept as a valid
`StrokeStyle` so old boards render). The model going forward: **one pen
tool · three appearances (Pen/Pencil/Marker) · width presets · opacity** —
appearance × geometry are orthogonal axes, never combined into new "tools".
The highlighter remains a separate dock instrument deliberately: it has
distinct blend semantics (multiply), persistent per-instrument memory, and in
classrooms it is a *mode* (mark the text) rather than a pen look.

## 7. Iconography ✅

- Icons were monochrome **PNG masks** (`sfIcons.ts` → `@2x.png`): blurry at
  3x displays and large sizes, with per-glyph "optical scale" fudge factors
  to compensate for inconsistent crops.
- Several names fell back to hand-drawn paths (shapes, sticky, grip, grids,
  elbow arrow) that didn't match SF stroke weight.
- Text labels persisted where icons + tooltips would do (inspector rows,
  z-order glyph buttons used unicode arrows `⤒↑↓⤓`).

**Fix shipped:** the supplied SF Symbols SVG set is now the source: 78
vector glyphs normalized onto a shared 72-unit optical canvas (preserving
SF's relative sizing) and tinted via `currentColor` CSS masks. New glyphs
cover align/distribute/duplicate/opacity/search/star/folder/board. Hand-drawn
fallbacks remain only for `sticky` and `grip` (no SF counterpart). Every
icon-only control keeps `title` + `aria-label`.

## 8. Information architecture

Home was a single "New board" button — no list of your boards, no way back
to yesterday's lesson except browser history, no grouping, no search
(`routes/Home.tsx`). For a teacher running parallel classes this is the
second-largest gap after resize. The `AppMenu` title slot also shows the
active *page* title where users expect the *board* title.

**Fix shipped:** the board library (workspace → folders → boards) with
favorites, recents, search, drag-to-file, inline rename — local-first.
Server-side sync of the library (Supabase `folders` table + board metadata)
and board-title unification are roadmap M-B. Full IA in
[02-information-architecture.md](02-information-architecture.md).

## 9. Other findings (sequenced, not shipped)

| Finding | Evidence | Disposition |
|---|---|---|
| Eraser width slider absent (presets only) while pen has both | `Dock.tsx` eraser popover | Fold into M-E control polish |
| `EmbedDialog` is reached from two different menus with different anchors | `Dock.tsx`, `AppMenu.tsx` | One insert surface in M-E |
| Snapshots, export, share buried in File menu | `AppMenu.tsx` | Board menu redesign M-E |
| No PDF page navigation beyond board pages | `assets/pdf.ts` | PDF workflow M-D |
| No text style presets (title/body) — only free font size | `TextToolbar.tsx` | M-E |
| Spotlight/follow exist but no laser pointer, timer, or focus mode | `CollabBar.tsx`, `followStore.ts` | Classroom kit M-F |
| `?` No keyboard shortcut overlay | — | M-E |
| Transformer resize lacks snapping (move-only snapping shipped) | `TransformLayer.tsx` | M-C |
| Marquee/endpoint drags don't auto-pan at viewport edges | `CanvasStage.tsx` | M-C |
