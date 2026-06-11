# 3 · Design System & Visual Language

The system already speaks Apple (`@notux/ui`, "Liquid Glass"); this redesign
hardens it into rules, fixes its contrast defects, and inventories every
component so new UI composes instead of improvising.

## 3.1 Material: Liquid Glass

One glass recipe, three intensities. All values are tokens in
`packages/ui/src/styles.css`; **components must consume tokens, never raw
colors.**

| Material | Use | Recipe |
|---|---|---|
| **Chrome glass** | dock, app menu, collab bar | `--dock-bg` tint · `blur(30px) saturate(180%)` · 1 px `--glass-stroke` · `--shadow-lg` |
| **Surface glass** | popovers, sheets, selection toolbar, cards | `--popover-bg` (more opaque: content sits *on* it) · `blur(28px)` |
| **Inset glass** | fields, segmented tracks, preset chips | `--field-bg` / `--segment-bg`, no blur (they sit on glass already) |

Physicality rules:

- Glass **stacks at most twice** (canvas → panel → popover). A popover over a
  panel is the depth ceiling; never blur-on-blur-on-blur.
- Light comes from above: panels carry the soft drop (`--shadow-lg`); inset
  elements carry none.
- Translucency must never cost legibility: anything textual sits on surface
  glass, not chrome glass.
- **Liquid Glass refraction tier** (roadmap M-E): specular top edge
  (`inset 0 1px 0 rgba(255,255,255,…)` — already on `.lg-button`) promoted
  to a `--glass-bevel` token on dock + popovers, plus a barely-there inner
  gradient for curvature. Subtle > showy; no animated refraction.

## 3.2 Color tokens

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--accent` | `#5ac8fa` | `#0a84ff` | selection, active states |
| `--accent-hover` | `#74d2fb` | `#2e95ff` | **new** — hover stays inside the accent ramp |
| `--snap-guide` | `#ffd60a` | `#ff9500` | **new** — alignment guides (Keynote yellow/amber) |
| `--selection` / `--selection-fill` | blue pair | blue pair | marquee + handles |
| `--fg-0` / `--fg-1` | 92% / 62% white | 92% / 55% ink | two text tiers only |

**State law (the light-mode-hover fix, now a rule):**

> *Hover is additive.* A hover state may brighten or tint a control but may
> never replace an active/accent surface with a neutral one. Concretely:
> every `--active` class ships a paired `--active:hover` rule, and active
> surfaces hover toward `--accent-hover`. Glyphs on accent are always white;
> glyphs on glass are always `--fg-0/1`. Minimum 3:1 contrast for icons
> against their effective backdrop in both themes.

### Ink palette (canvas content)

14 curated colors (`apps/web/.../palette.ts`): 6 grays + 8 hues from the
Apple system family — chosen to survive both paper colors via the existing
adaptive-ink mapping (`theme/adaptiveInk.ts`). User-extensible through
Recent + Saved, not by widening the grid.

## 3.3 Type, radius, spacing, motion

- **Type**: system stack (SF on Apple hardware). Tiers: 11 section labels ·
  13 controls · 14 menu/body · 18 panel titles · 22 page titles. Two
  weights (500/600–700). Tabular numerals for live values.
- **Radius grammar**: 999 pills/swatches · 16–18 panels & cards · 8–10
  buttons/fields · 6 inner chips. Nothing square.
- **Spacing**: 4-px base grid; popover padding 12; section gap 14–18.
- **Hit targets**: ≥ 34 px pointer, ≥ 40 px primary touch, 44 px dock tools.
- **Motion**: 120–220 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`; popovers scale
  from their anchor (`--tail-x` transform-origin — already shipped); every
  animation gated by `prefers-reduced-motion` (shipped). No springs longer
  than 300 ms — this is a tool, not a toy.

## 3.4 Iconography

- **Source**: Apple SF Symbols, as **vector SVGs** from project assets
  (`packages/ui/src/icons/assets/`), normalized onto a shared 72-unit square
  canvas so glyphs keep SF's relative optical sizing, rendered as
  `currentColor` CSS masks (`Icon.tsx`).
- Icon-only controls are the default; **every one carries `title` +
  `aria-label`** (tooltip = discoverability, label = accessibility).
- Text labels are reserved for: destructive confirmations, empty states,
  menu rows, and the pen-style presets (Pen/Pencil/Marker — names *are* the
  mental model there).
- One metaphor per concept across the app: e.g. `square.and.arrow.up` is
  share/export everywhere; layers-3d glyphs are z-order everywhere.

## 3.5 Component inventory

### `@notux/ui` (primitives)
| Component | Status | Notes |
|---|---|---|
| `GlassPanel` | shipped | chrome/surface glass container |
| `GlassButton` | shipped | + contrast-safe active-hover (this PR) |
| `Popover` | shipped | anchored, auto-flip, tail, esc/outside-close |
| `Sheet` | shipped | popover→bottom-sheet at ≤640 px |
| `Segmented` | shipped | |
| `Slider` | shipped | container-safe + compact value (this PR) |
| `Swatch` | shipped | plain/none/rainbow variants |
| `Icon` | shipped | vector SF masks (this PR) |
| `Instrument` | shipped | pen illustrations (dock future) |
| `Tooltip` (rich) | M-E | today: native `title` |
| `Menu` (roving-focus) | M-E | extracted from AppMenu patterns |
| `Dialog` (modal confirm) | M-E | destructive actions |
| `Toast` | M-E | export done, link copied |

### App / canvas components
| Component | Status | Notes |
|---|---|---|
| `Dock` | shipped | tool instruments + popovers |
| `ColorPicker` | **reworked** | two-layer quick/advanced |
| `SelectionToolbar` | **new** | contextual; replaces `SelectionInspector` (deleted) |
| `TransformLayer` | **reworked** | universal resize/rotate, aspect-locked media |
| `OverlayLayer` | **reworked** | + snap guides, endpoint handles |
| `SelectTool` | **reworked** | + snapping, endpoint drag |
| `alignOps` / `snapping` | **new** | align, distribute, magnetic snap |
| `viewportStore` | **new** | world→screen projection for DOM chrome |
| Library (`Home`, `libraryStore`) | **new** | folders/favorites/recents/search |
| `AppMenu` | unchanged | consolidation queued (M-E) |
| `CollabBar`, `FollowPill`, `SaveStatus`, `SnapshotsPanel`, `TextToolbar`, `EmbedDialog` | unchanged | M-E/M-F touchpoints |
