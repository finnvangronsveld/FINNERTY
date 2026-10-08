# FINNERTY

The home of Finnerty, streamer on Twitch as `finnerty_`. The site is a cozy streamer
desk seen from above: a notebook with a flippable polaroid, an ON AIR light box, a tablet
that shows the stream when Finn is live, a Stream Deck-style soundboard, sticky-note links
and a steaming mug. Day and night themes; the room starts dark until you flip the light switch.

## Sound

All sounds are CC0 samples by [Kenney](https://kenney.nl) (Interface Sounds, UI Audio,
Music Jingles), trimmed, level-matched and converted to MP3 in `public/sounds/`
(about 180 KB in total). `src/lib/sfx.ts` prefetches them, decodes them after the first
click (browsers require a gesture) and plays them through Web Audio. Mute is remembered.

## Stack

Next.js 16 (App Router), React 19, plain CSS (`src/app/globals.css`), Phosphor icons.
Fonts: Shantell Sans (handwriting, using its informality axis) and Courier Prime (typed labels).
`/api/live` asks DecAPI for live status and the Twitch avatar, cached at the CDN for 60 seconds.

```bash
pnpm install
pnpm dev
```

Earlier versions are preserved at git tag `archive/finnertyverse-v1` (Vault site) and in history.
