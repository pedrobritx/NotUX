# NotUX

A collaborative infinite whiteboard for teaching — pen, shapes, text, PDFs, real-time multiplayer. Web first (PWA on GitHub Pages), native iPad and Android tablet apps later. Designed against Apple's Human Interface Guidelines and Liquid Glass.

## Status

Milestone 4 — Realtime collaboration. The canvas (M2), local Yjs persistence + undo/redo (M3), and now realtime multiplayer sync are in place: edits and live cursors sync between everyone on a board over Supabase Realtime, with the board falling back to local-only mode when Supabase isn't configured. PDF import and the Liquid Glass dock land in later milestones.

Realtime requires Supabase Realtime to be reachable by the `anon` role for the `notux-board-*` broadcast topics (the default, no-authorization Realtime mode works out of the box). Late-joiners get current board state from connected peers; persisting snapshots server-side for offline late-joiners is a later milestone.

## Repo layout

```
apps/web/                React + Vite app (the PWA)
packages/canvas/         Konva-based canvas engine (per-page stage, layers, tools)
packages/sync/           Yjs CRDT + Supabase Realtime provider + Postgres persistence
packages/ui/             Liquid Glass component library
packages/types/          Shared TypeScript types (board/page/asset/yshape)
supabase/                Migrations + local config
.github/workflows/       GH Pages deploy
```

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Supabase is optional locally — the app runs in a "no-sync" mode if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset. To enable sign-in and sync, create a `.env.local` in `apps/web/`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Sign-in supports **Google OAuth** and an email magic-link fallback. Boards
created while signed in are private to your account by default and can be shared
for realtime collaboration with one click. Full setup — including the Google
OAuth client and Supabase configuration — is documented in
[`docs/SETUP.md`](docs/SETUP.md).

## Deploying

Pushing to `main` runs the GitHub Pages workflow. The repo's two secrets must be set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The site builds with `base: /NotUX/` and copies `index.html` → `404.html` so the SPA router survives deep links.

## Plan

The full v1 architecture and milestone breakdown lives in the approved planning file (see `claude/notuux-whiteboard-brainstorm-WaDUS` branch description).
