# FINNERTY

The home of Finnerty: streamer, hardstyle DJ and producer. The site is a piece of
studio hardware you switch on: a broadcast console with a scratchable turntable,
a 16-pad drum machine with a step sequencer, and a CRT monitor that shows the
Twitch stream when Finn is live.

## Sound

Every sound is synthesized live with the Web Audio API. There are no audio files.

- `src/audio/kit.ts` holds the synthesis building blocks (envelopes, filters, saturation, noise, reverb impulse).
- `src/audio/instruments.ts` holds the 16 drum machine voices, tuned to G minor (distorted hardstyle kick, reverse bass, supersaw stab, screech, formant "hey", air horn and more).
- `src/audio/engine.ts` is the engine: master bus with limiter and reverb, interface sounds (key thocks, knob detents, toggle snaps, relay clunk, 50 Hz mains hum, CRT degauss and flyback whine, patch-cable plugs), the sequencer clock and the vinyl scratch.

Audio starts only after the power key is pressed (browsers require a gesture). Volume and mute are remembered per browser.

## Stack

Next.js 16 (App Router), React 19, plain CSS (`src/app/globals.css`), Phosphor icons.
Fonts: Michroma (panel labels), Doto (LED displays), IBM Plex Mono (body).
Live status comes from `/api/live`, which asks DecAPI and is cached at the CDN for 60 seconds.

```bash
pnpm install
pnpm dev
```

The previous site (Finnertyverse with Vault Points) is preserved at the git tag `archive/finnertyverse-v1`.
