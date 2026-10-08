# FinnOS

Finnerty's site is a full-screen desktop operating system in the browser, in glossy
2010s (Aqua-era) style. Boot it, log in, and use it like a computer.

## What you can do

- Windows you can drag, resize, minimize into the Dock, zoom and close; a menu bar with
  working menus; a Dock with magnification, running-app lights and a Trash.
- A desktop and a virtual file system (Desktop, Documents, Pictures, Trash) stored in the
  visitor's browser: create, rename, move, trash and restore files and folders.
- Spotlight search (Ctrl + Space or Alt + Space), Growl-style notifications, sleep, restart,
  shut down and log out.
- Apps: Finder, Navigator (web browser), Twitch (stream plus chat), TextEdit, Terminal,
  Calculator, Sketch, Calendar, Preview, System Preferences, About.
- Games with leaderboards: Snake, Blocks, 2048, Bricks and Minesweeper, plus Game Center.
  Log in with Twitch (menu bar or Game Center) to save scores.
- Navigator fetches pages through `/api/reader` and shows a clean, script-free version.

Keyboard: Alt + W closes a window, Alt + M minimizes, Alt + Q quits the app, Alt + N opens a new window.

## Code

- `src/os/store.ts` session state, `src/os/wm.ts` window manager, `src/os/fs.ts` file system.
- `src/os/shell.tsx` boot, login and the desktop; `menubar.tsx`, `dock.tsx`, `desktop.tsx`, `window.tsx`, `overlays.tsx`.
- `src/os/apps/*` one file per app; `src/os/apps.tsx` is the registry.
- `src/os/games/*` the arcade games and the shared score kit.
- `src/app/api/live` live status and avatar via DecAPI, cached for 60 seconds.
- `src/app/api/auth/*` Twitch login (no scopes, token revoked right after reading the profile;
  the session is an HMAC-signed cookie). `/api/auth/dev` signs in a fake player, local dev only.
- `src/app/api/games/*` run tokens, score submission (with a plausibility check on run length) and leaderboards.
- `src/app/api/reader` the reader proxy: public http(s) only, private and metadata IPs blocked on every
  redirect, 3 MB / 8 s limits, per-IP rate limit, sanitised output. Search uses Wikipedia and DuckDuckGo's public APIs.

## Database

Neon Postgres (`DATABASE_URL`). Tables are in `db/*.sql`; apply them with
`node --env-file=.env.local scripts/migrate.mjs`. Migrations never run during the build.
Production env: `APP_URL`, `DATABASE_URL`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `AUTH_SECRET`.
Twitch redirect URL: `https://<domain>/api/auth/callback/twitch`.

Sounds are CC0 samples by [Kenney](https://kenney.nl), trimmed and level-matched in `public/sounds/`.

```bash
pnpm install
pnpm dev
```
