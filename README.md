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
  Calculator, Soundboard, Sketch, Minesweeper, Calendar, Preview, System Preferences, About.

Keyboard: Alt + W closes a window, Alt + M minimizes, Alt + Q quits the app, Alt + N opens a new window.

## Code

- `src/os/store.ts` session state, `src/os/wm.ts` window manager, `src/os/fs.ts` file system.
- `src/os/shell.tsx` boot, login and the desktop; `menubar.tsx`, `dock.tsx`, `desktop.tsx`, `window.tsx`, `overlays.tsx`.
- `src/os/apps/*` one file per app; `src/os/apps.tsx` is the registry.
- `src/app/api/live/route.ts` live status and avatar via DecAPI, cached for 60 seconds.

Sounds are CC0 samples by [Kenney](https://kenney.nl), trimmed and level-matched in `public/sounds/`.

```bash
pnpm install
pnpm dev
```
