# NotUX

A collaborative infinite whiteboard for teaching — pen, shapes, text, PDFs, real-time multiplayer. Web first (PWA on GitHub Pages), native iPad and Android tablet apps later. Designed against Apple's Human Interface Guidelines and Liquid Glass.

## Status

Realtime multiplayer, PDF/image/audio import, YouTube/Drive embeds, the Liquid
Glass dock, durable autosave, and the M-A redesign tier (universal resize +
smart alignment, contextual selection toolbar, two-layer color system, vector
SF Symbols, and the folder-based board library) are in place. The product-wide
UX redesign — audit, design system, interaction specs, benchmarks, and the
prioritised roadmap — lives in [`docs/redesign/`](docs/redesign/README.md).

Access is membership-based: boards are private to their owner and shared through revocable, expiring **capability links** (see `0005_security_membership.sql` and [`docs/SETUP.md`](docs/SETUP.md)); uploaded materials live in a private Storage bucket served via signed URLs. Realtime uses the `notux-board-*` topics — public channels by default, or RLS-authorized **private channels** when `VITE_REALTIME_PRIVATE=true` and "Allow public access" is disabled in Realtime settings. Late-joiners get current board state from connected peers and the durable autosave snapshot.

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
