# 4 · Interaction Design Specifications

Normative specs for the interactions shipped in this PR plus the queued
tier. World-space values scale with zoom unless marked *screen*.

## 4.1 Selection & transform

**Select** (pointer/finger, Select tool):
- Tap object → select. Shift-tap → toggle membership. Tap empty → clear +
  marquee. Locked objects select (amber dash) but never drag.
- Drag selected object(s) → translate, snapshot-based (no drift), single
  undo entry per gesture.

**Transform handles** (all kinds except line/arrow):
- 8 resize anchors + rotate handle (Konva Transformer), min size 5 px,
  `ignoreStroke`.
- **Aspect lock**: any selection containing an image/PDF/embed resizes
  proportionally; text scales its font with height; stickies scale type by
  √(sx·sy); strokes bake the affine transform into points and scale brush
  size by mean |scale|.
- Transform end commits one transaction → one undo step.

**Line/arrow endpoints** (single selection):
- Two ⌀14 *screen*-px hit targets (7 px visual dots, white fill, accent
  ring) at each endpoint; endpoint hit-test wins over body hit-test.
- Drag endpoint → reshape; **Shift** constrains to 45° steps around the
  fixed endpoint; endpoints participate in snapping.
- In multi-selections lines show the dashed box and translate only.

## 4.2 Smart alignment

- **Targets**: edges + centers (x: left/cx/right, y: top/cy/bottom) of every
  unselected shape on the page, collected once per gesture.
- **Tolerance**: 8 *screen* px ÷ zoom (zoom-independent feel).
- **Resolution**: nearest candidate per axis wins; both axes snap
  independently and simultaneously.
- **Guides**: 1.5 px lines in `--snap-guide`, spanning the union of the
  matched target and the moving bounds, cleared on pointer-up/cancel.
- **Bypass**: hold **Alt/Option** to drag friction-free.
- Applies to: selection drags and endpoint drags (point-snap). *Queued
  (M-C)*: resize-snap, equal-gap suggestions, auto-pan at viewport edges,
  drag-start guides for sticky grids.

## 4.3 Contextual selection toolbar

- **Placement**: horizontally centered on the selection bounds, 12 px above;
  flips below when within 72 px of the top (dock safe area); clamped 8 px
  from viewport edges; tracks live during drag/transform/viewport changes.
- **Visibility**: any selection in Select mode, hidden during text editing
  (the text toolbar owns that moment). Locked-only selection → single
  **Unlock** pill.
- **Content** (only applicable controls render):
  `[ink chip] [fill chip] [thickness] [text style] [opacity] | [duplicate] [arrange] [lock] [delete]`
  - Chips open swatch popovers (palette + recents; fill adds None).
  - Thickness: 5 presets + numeric field. Text style: alignment segmented +
    font size. Opacity: checkerboard slider.
  - Arrange popover: z-order (4); align edges/centers (6) at ≥2 selected;
    distribute H/V at ≥3.
  - Duplicate: clones +24 px ÷ zoom diagonal, selects the clones.
- All buttons 34 px, icon 17 px, tooltip + `aria-label`; popovers reuse the
  standard `Popover` (esc/outside-tap close, auto-flip, tail).

## 4.4 Color

- **Quick layer** (default): 14-swatch palette, Recent row (auto-tracked on
  every pick, device-local, deduped, max 8), Saved row. One tap = applied.
- **Advanced layer** (one "More" disclosure): hex field (live-validated),
  opacity slider, Save color. Eyedropper stays in the header when
  `EyeDropper` API exists.
- Identical model in dock picker and selection toolbar; sticky tool keeps
  its 5 paper colors.

## 4.5 Drawing tools

- **One pen tool.** Styles Pen/Pencil/Marker are *appearances* of it; width
  (5 presets/instrument) and opacity are orthogonal. Highlighter and eraser
  are separate instruments (different semantics, not different looks).
- Each instrument remembers its own color/width/opacity (shipped behaviour,
  unchanged) — switching Pen→Highlighter→Pen restores your pen exactly.
- Active tool tap re-opens its options popover (shipped pattern).
- *Queued (M-C/M11)*: pressure tuning, palm rejection, wet-ink layer.

## 4.6 Canvas navigation

Unchanged and confirmed good: wheel = pan, ⌘/Ctrl+wheel = zoom-at-cursor,
space/hand/middle-drag = pan, pinch on touch. Manual gestures break follow
mode (`breakFollow`) — correct for student independence. *Queued*: zoom
pill with fit-to-content (M-E), two-finger double-tap zoom-out (M-G).

## 4.7 Keyboard map (current + shipped)

| Keys | Action |
|---|---|
| ⌘Z / ⌘⇧Z | undo / redo |
| ⌘A | select all |
| Delete | delete selection (locked skipped) |
| ⌘] / ⌘[ (+⇧) | forward/backward (front/back) |
| ⌘⇧L | lock toggle |
| Space-drag | pan |
| Shift (drag endpoint) | 45° constrain |
| **Alt (drag)** | **bypass snapping** *(new)* |
| Esc | clear selection / close popover / end text edit |

*Queued (M-E)*: tool keys (V P H E T S N), ⌘D duplicate, arrow-key nudge
(1 px / 10 px with Shift), `?` shortcut overlay.
