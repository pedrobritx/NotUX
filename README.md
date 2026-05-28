# NotUX

A collaborative infinite whiteboard for teaching — pen, shapes, text, PDFs, real-time multiplayer. Web first (PWA on GitHub Pages), native iPad and Android tablet apps later. Designed against Apple's Human Interface Guidelines and Liquid Glass.

## Status

Milestone 1 — Skeleton. Vite + React app, Supabase magic-link auth, two routes (`/`, `/board/:id`), workspace stubs for `@notux/canvas`, `@notux/sync`, `@notux/ui`, `@notux/types`, Supabase migration, and GitHub Pages deploy workflow. Canvas, real-time sync, tools, PDF import, and Liquid Glass dock land in later milestones.

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

## Deploying

Pushing to `main` runs the GitHub Pages workflow. The repo's two secrets must be set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The site builds with `base: /NotUX/` and copies `index.html` → `404.html` so the SPA router survives deep links.

## Plan

The full v1 architecture and milestone breakdown lives in the approved planning file (see `claude/notuux-whiteboard-brainstorm-WaDUS` branch description).
