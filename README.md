# Norabox

Create a room, share the invite code, and listen to the same YouTube music at the same time.

## Stack

- **Next.js 16** (App Router) behind a small custom server (`server.ts`) that also hosts **Socket.IO** for real-time rooms
- **Prisma 7** with **PostgreSQL on Neon** (via `@prisma/adapter-neon`)
- **Tailwind CSS 4**, `@dnd-kit` for drag-and-drop reordering
- YouTube Data API v3 (search) + YouTube IFrame Player API (playback)

## Getting started

Requires Node.js 22 (`nvm use`).

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in DATABASE_URL, AUTH_SECRET, YOUTUBE_API_KEY
npm run db:deploy           # applies prisma/migrations to your database
npm run dev                 # http://localhost:3000
```

Without `YOUTUBE_API_KEY`, search is disabled but pasting a YouTube link still works (via oEmbed).

## Checks and tests

```bash
npm run lint        # ESLint
npm run typecheck   # generates Next.js route types, then tsc
npm test            # Vitest unit tests in tests/ (npm run test:watch while developing)
```

The unit tests need no database, network or API keys. GitHub Actions (`.github/workflows/ci.yml`) runs all
three on every push to any branch and on pull requests.

## Deploying (Vercel + a realtime host)

Vercel's serverless functions can't hold WebSocket connections, so the app is deployed in two parts that
share the same Neon database and `AUTH_SECRET`:

**1. Realtime server** (Railway, Render, Fly, or any host for a long-running Node process)

- Build: `npm install` · Start: `npm run start:realtime` · Node 22 · health check: `/health`
- Env: `DATABASE_URL`, `AUTH_SECRET`, `CLIENT_ORIGIN=https://<your-app>.vercel.app`, `NODE_ENV=production`
  (the host usually sets `PORT`)

**2. Next.js app on Vercel**

- Env: `DATABASE_URL`, `AUTH_SECRET`, `YOUTUBE_API_KEY`, `NEXT_PUBLIC_SOCKET_URL=https://<realtime-host>`,
  `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `NEXT_PUBLIC_SOCKET_URL` is baked in at build time, so redeploy after changing it.

Run `npm run db:deploy` against Neon when migrations change.

Signed-in users are identified to the realtime server by a 5-minute token from `/api/realtime/token`,
because the session cookie isn't sent across domains. Guests need no token.

Locally, `npm run dev` runs both parts in one process, so neither of the two extra variables is needed.

## How sync works

The server is the source of truth for each room's playback: `{ itemId, isPlaying, position, updatedAt }`.
Each client measures its clock offset from the server with a few pings, computes where the track *should* be,
and every second nudges its local YouTube player (play/pause/seek) if it drifts more than ~0.8s.
The server advances the playlist on its own timer (using the track duration), following the loop mode
(`none` / `one` / `all`).

Volume on each client = admin's room volume × the listener's own volume.

## Playlists and visibility

Signed-in users make playlists on **My playlists** (`/playlists`). Each has a visibility (`Post.visibility`):

- **Private** (default): only the author.
- **Link only**: anyone with the share link `/s/<shareToken>`. The post's own URL (`/forum/<id>`) doesn't
  open it for others, and the author can reset the token to revoke old links.
- **Public**: everyone, and listed on the forum.

Access rules live in `src/lib/post-access.ts` and are used by pages, likes, room imports and scenario suggestions.

## Song memos

In a room, the admin can attach a memo to each song (e.g. "play when the party enters the crypt"). Memos are
saved with the playlist item and sent **only to the admin's connections**, so players never see story cues.

## Languages

English, Korean and Japanese. The language comes from the visitor's saved choice (the language
menu in the header, stored in the `norabox_locale` cookie), otherwise from their browser's
`Accept-Language`, falling back to English. URLs are the same in every language, so invite links
work for everyone.

- UI text lives in `src/i18n/messages/en.ts`, `ko.ts` and `ja.ts` (named by language code: `ja` is
  Japanese, like `ko` is Korean). `ko` and `ja` are typed against `en`, so a missing string fails
  `npm run typecheck`.
- Fonts: Inter for Latin (next/font, preloaded), Pretendard on Korean pages and Noto Sans JP on
  Japanese pages. The two CJK fonts are self-hosted in `public/fonts/v1/`, split by character range,
  and each page loads only its own language's stylesheet (`CJK_FONTS` in `src/app/layout.tsx`).
  All use `font-display: optional`, so text never switches font after it shows. To update a font,
  put it under a new version folder (`v2`): `/fonts/*` is cached for a year (`next.config.ts`).
- Server Components use `await getI18n()` (`src/i18n/server.ts`); Client Components use `useI18n()`
  (`src/i18n/client.tsx`).
- The API and realtime server return error *codes* (keys of `errors` in the dictionaries), and the
  browser shows them in the viewer's language with `tError(code)`.

## Roles

| | Admin (room creator) | DJ | Listener |
|---|---|---|---|
| Listen, personal volume | ✓ | ✓ | ✓ |
| Play/pause/seek/skip, loop, add/remove/reorder songs | ✓ | ✓ | |
| Room (master) volume, promote/demote DJs | ✓ | | |

Visitors don't need an account. A random client id kept in `localStorage` identifies the creator as admin.
Signed-in users are recognised by account instead, so the admin role works across devices.

## Database

Set `DIRECT_URL` (Neon's unpooled URL) for migrations; through the pooler, `prisma migrate` can time out
acquiring its lock (error P1002).

Deleting an account only sets `User.status` to `deleted`: the user can no longer sign in, their posts stay
up with the author shown as "Deleted user", and their email and username stay reserved.

Schema changes: edit `prisma/schema.prisma`, then `npm run db:migrate -- --name <change>` (needs a
database Prisma can create a shadow copy of; with Neon, a dev branch works well), and `npm run db:deploy` in production.

## Image storage

Profile images are stored in a private S3 bucket at `images/avatars/<userId>` (one object per user,
overwritten on change) and served through `/api/users/<id>/avatar`, so the bucket needs no public access
and no CORS rules. The database only keeps `User.avatarMime` as the "has an image" flag. See
`src/lib/storage.ts`. The variables are `S3_*` rather than `AWS_*` because Vercel presets `AWS_REGION`
to the function's own region.

## Notes

- After 5 wrong passwords in a row (`MAX_LOGIN_ATTEMPTS` in `src/lib/limits.ts`) an account is locked; a correct password resets the count. The login form then tells people to email `CONTACT_EMAIL`. To unlock an account, run in the database's SQL editor: `update "User" set "lockedAt" = null, "failedLogins" = 0 where email = '<their email>';`
- On iOS, a page can't change media volume (the hardware buttons control it), so the volume sliders have no effect there.
- Rooms are deleted after 6 hours with nobody in them and no changes (playlist and DJs included); the name becomes free again. The realtime server sweeps every 10 minutes, and every room lookup also checks expiry, so it holds while a free-tier host is asleep. The TTL is `ROOM_INACTIVE_TTL_MS` in `src/lib/rooms.ts`.
- Room state (who's connected, the live position) lives in memory. The playlist, loop mode, room volume and DJs are stored in the database.
