# NotUX Enhancement Roadmap

Re-grounded against the live repo (currently at **M9**). The earlier strategy doc assumed
the repo sat at M4; in fact `perfect-freehand`, Yjs + a custom Supabase-broadcast provider,
`y-indexeddb`, PDF/image import, audio + YouTube/gdrive embeds, named snapshots, and
selection/transform/z-order/lock are all already shipped. This roadmap keeps the recommended
direction but re-prioritizes around the genuine, verified gaps.

Strategic posture is unchanged: keep the Konva + Yjs + Supabase Realtime + Liquid Glass
stack; treat Excalidraw/tldraw/OpenBoard as reference implementations, not dependencies.

## M10 — Durable Yjs autosave persistence ✅ (this PR)

**The critical architectural fix.** Board state previously lived only in each client's
IndexedDB and the ephemeral Realtime broadcast — a fresh client (no IndexedDB) or a
late-joiner arriving after every peer had left got an **empty board**.

The `snapshots` table already supports a single self-compacting `autosave` row per board
(unique partial index + RLS insert/update for public boards), so **no migration and no
compaction Edge Function are needed** — we diverge from the original append-log proposal in
favor of the simpler model the schema already encodes.

- `packages/sync/src/autosave.ts`: `loadAutosave` (fetch + `Y.applyUpdate` **merge**, not the
  destructive `restoreSnapshot`), `startAutosave` (debounced ~2s / max-wait ~10s writer with a
  best-effort `pagehide`/`visibilitychange` flush, update-or-insert the autosave row), and the
  shared `bytea` hex helpers.
- `packages/canvas/src/store/shapeStore.ts` (`initBoard`): after IndexedDB hydrate + realtime
  attach, `loadAutosave` then `startAutosave` — only when a Supabase client is configured
  (local-only mode is unchanged).
- `apps/web/src/features/board/snapshotsApi.ts`: reuses the hex helpers from `@notux/sync`.

*Exit criterion:* a board survives all users leaving; a fresh client and an offline late-joiner
both load the last state and converge.

## M11 — Native ink feel

Feature-detect `getCoalescedEvents()` (fall back to plain `pointermove`); add a
`{ desynchronized: true }` context on a **dedicated wet-ink Konva layer** split out of the
shared `OverlayLayer` so only it redraws per move; `pointerType`-based palm rejection in
`PenTool`. Raw points + pressure are already stored — keep that. Tune `strokeGeometry.ts`
`streamline`/`smoothing` for the "hot elbows" artifact. *Exit:* smooth Apple-Pencil strokes on
iPad Safari, crisp at any zoom; only the wet-ink layer redraws during a stroke.

## M12 — Scale the canvas

Add `rbush` as a spatial index in `shapeStore` for viewport culling + hit-testing (replaces the
linear scans in `CanvasStage.hitTestWorld` / `rectIntersect`); cull off-screen shapes in
`ShapesLayer`; set Konva `perfectDrawEnabled(false)` + `shadowForStrokeEnabled(false)` on shape
nodes. *Exit:* 60 fps panning a 5,000+ shape board.

## M13 — Editing polish

Refine the area eraser toward a scribble-overlay + geometry hit-test feel; auto-sizing stickies;
color picker palette + custom + recents (in Living Cosmos).

## M14 — Content breadth

URL bookmarks via a cached `unfurl` Supabase Edge Function (genuine gap). Verify PDF import is
lazily rasterized per page.

## M15 — Embeds registry

Generalize the existing YouTube/gdrive embeds into a tldraw-style `EmbedDefinition` registry;
export embeds as placeholders (iframes can't be captured by canvas export).

## M16 — Cross-platform packaging

Add `vite-plugin-pwa` + full manifest + icons (genuine gap — `index.html` has only a
`theme-color`); wrap with Capacitor gated by `Capacitor.isNativePlatform()`; macOS as an
installed PWA. Do not introduce React Native/Flutter.

## Design track — Living Cosmos re-skin

Replace the Apple-system tokens in `packages/ui/src/styles.css` (`--accent:#5ac8fa`/`#0a84ff`)
with the Living Cosmos palette (midnight `#0a0e1a`, nebula `#3d4fd6`, rain `#4db8c8`, moss,
sandstone), the Inter + IBM Plex Mono fonts, the organic radius grammar (12/16/999/8), and the
`--ease-organic`/`--ease-spring` motion curves; set `index.html` `theme-color` to `#0a0e1a`.
Keep accessibility guards (`prefers-reduced-motion`, focus rings using rain). Only touches the
token layer the components already consume, so it can land early.
