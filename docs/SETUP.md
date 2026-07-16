# NotUX — Online Setup (Sync, Sign-in, Google OAuth)

NotUX runs fully offline in local-only mode. To enable sync, multiplayer, and
sign-in you need a Supabase project; to enable "Sign in with Google" you also
need a Google OAuth client. None of these secrets live in the repo — the
frontend only ever sees the public Supabase URL + anon key (injected at build
time), and `.env.local` is git-ignored.

## 1. Supabase credentials (required for sync + sign-in)

1. In the Supabase Dashboard, open **Project Settings → API Keys**.
2. Copy the **Project URL** and the **Publishable / anon key**.
3. Create `apps/web/.env.local` (already git-ignored):

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable-anon-key>
   ```

The anon key is designed to be public — it is safe in the browser bundle
because Row Level Security (RLS) enforces all access rules server-side. The
**secret** key must never be placed in `.env.local` or the frontend.

## 2. Apply the database migrations

The schema (boards, pages, snapshots, assets, profiles) and all RLS policies
live in `supabase/migrations/`. Apply them to your project with the Supabase
CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

`0004_profiles_and_privacy.sql` adds the `profiles` table (owner-only — a
user's account info is readable only by themselves) and a trigger that
auto-creates/refreshes a profile from auth metadata on every sign-in.

`0005_security_membership.sql` is the security hardening migration. It replaces
the old "free-for-all public board" model with explicit membership
(`board_members`) and hashed, expiring **capability share tokens**
(`board_shares`). After applying it:

- A board's creator is auto-enrolled as `owner`. Reads are allowed for
  owners/members (and, transitionally, legacy `is_public` boards); **writes and
  deletes require an owning or editing membership** — a leaked board UUID no
  longer lets a stranger overwrite or wipe a lesson.
- The **`board-assets` bucket is flipped to private**. Asset bytes are served
  only via short-lived signed URLs whose issuance is gated by the same
  membership RLS.
- `realtime.messages` policies are added so Realtime channels can be authorized
  by membership once you switch them to private (see step 2a).

### 2a. Enable guest access and (optionally) private Realtime — **manual**

The capability-token flow lets an account-less student join a shared board:

1. **Authentication → Sign In / Providers → Anonymous sign-ins: enable.** When a
   visitor opens an invite link, the app mints an anonymous session and redeems
   the token into a scoped membership. Without this, only signed-in users can
   redeem invites.
2. *(Recommended)* **Realtime → Settings → disable "Allow public access"**, then
   build the web app with `VITE_REALTIME_PRIVATE=true`. The client then opens
   each board channel as a private, RLS-authorized channel so only members can
   subscribe or broadcast. Leave this off until the policies in 0005 are applied
   and anonymous sign-in works, or realtime collaboration will fail to connect.

## 3. Google OAuth (required for "Sign in with Google")

### 3a. Create a Google OAuth client — **you must do this manually**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or pick) a project named e.g. **NotUX**.
2. **APIs & Services → OAuth consent screen** → configure (External), add your
   email as a test user while in testing.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     https://notux.britx.me
     https://<project>.supabase.co
     ```
   - **Authorized redirect URIs** (this is the Supabase callback, not the app):
     ```
     https://<project>.supabase.co/auth/v1/callback
     ```
4. Copy the **Client ID** and **Client Secret**.

### 3b. Give them to Supabase — **you must do this manually**

In the Supabase Dashboard: **Authentication → Providers → Google** → paste the
Client ID and Client Secret, enable, and **Save**.

(For local `supabase start`, the same values are read from the environment via
`supabase/config.toml`: export `SUPABASE_AUTH_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_GOOGLE_SECRET` before starting the stack.)

### 3c. Allowed redirect URLs

Confirm **Authentication → URL Configuration** includes:
- `http://localhost:5173/auth/callback`
- `https://notux.britx.me/auth/callback`

These are already declared for local dev in `supabase/config.toml`.

## 4. CI / GitHub Pages deploy

The Pages workflow builds with the public Supabase values from repo secrets. In
**GitHub → Settings → Secrets and variables → Actions**, set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(No Google value is needed at build time — OAuth is brokered entirely by
Supabase, so the frontend never holds the Google client ID or secret.)

## 5. Verify

```bash
pnpm install
pnpm dev      # http://localhost:5173
```

- Home shows **Sign in with Google** plus an email magic-link fallback.
- Signing in with Google redirects to `/auth/callback` and back, with your
  name/avatar coming from the Google account.
- A new board you create while signed in is **🔒 Private** (only you can see its
  annotations). Use the **Share** chip (top-right of the board) to make it a
  collaborative link anyone can edit in realtime.
- Pull the network connection: the status chip switches to *"Offline — saved
  locally, will sync when reconnected"* and editing keeps working against
  IndexedDB.

## Privacy & security summary

- **Account/login info** lives in `profiles`, gated by RLS to the owning user
  only — no other user can read it.
- **Access is membership-based** (`board_members`). The owner and invited
  collaborators can read a board; only owners and editing members can write or
  delete. A board UUID alone grants nothing — the old enumeration/leak path is
  closed.
- **Sharing uses capability tokens** (`board_shares`): the owner mints a
  high-entropy, role-scoped, expiring link; only its SHA-256 hash is stored, and
  it's redeemed once into a membership. A guest student redeems via an anonymous
  session rather than open public access.
- **Uploaded materials** (PDF/image/audio) live in a **private** Storage bucket
  and are reachable only through short-lived signed URLs gated by membership.
- **Presence** (collaborator names/colors/avatars) is derived from each peer's
  own session and broadcast peer-to-peer over Realtime awareness — never by
  reading another user's profile row.
- **Secrets** never enter the repo: `.env`, `.env.local`, and `.env.*.local`
  are git-ignored; only the public anon key reaches the browser.
