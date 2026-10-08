'use client';
/**
 * Sound player for the desk. Samples are CC0 sounds by Kenney (see public/sounds/CREDITS.txt),
 * trimmed and level-matched. Nothing loads or plays until the visitor switches on the lamp,
 * which is also the gesture browsers require before audio may start.
 */

export const SOUNDS = [
  'hover',
  'press',
  'release',
  'tick',
  'drop-a',
  'screen-on',
  'screen-off',
  'welcome',
  'startup',
  'open',
  'close',
  'error',
  'notify',
  'trash',
  'toggle',
] as const;

export type SoundName = (typeof SOUNDS)[number];

type State = { ready: boolean; muted: boolean };
type Opts = { gain?: number; rate?: number; jitter?: number; delay?: number };

const KEY = 'finnerty:sound';

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private raw: Promise<Map<SoundName, ArrayBuffer>> | null = null;
  private lastHover = 0;
  private listeners = new Set<() => void>();
  state: State = { ready: false, muted: false };
  private volume = 0.9;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.state.muted = localStorage.getItem(KEY) === 'off';
    } catch {
      /* storage blocked */
    }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Download the (tiny) files ahead of time; decoding waits for the gesture. */
  prefetch() {
    if (this.raw || typeof window === 'undefined') return;
    this.raw = Promise.all(
      SOUNDS.map(async (name) => {
        try {
          const res = await fetch(`/sounds/${name}.mp3`);
          return [name, await res.arrayBuffer()] as const;
        } catch {
          return null;
        }
      }),
    ).then((list) => new Map(list.filter((x): x is readonly [SoundName, ArrayBuffer] => !!x)));
  }

  /** Call from a click/tap. Creates the audio context and loads every sample. */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return this.loading ?? Promise.resolve();
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return Promise.resolve();
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.state.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
    this.prefetch();
    this.loading = this.raw!.then((raw) =>
      Promise.all(
        [...raw].map(async ([name, data]) => {
          try {
            this.buffers.set(name, await ctx.decodeAudioData(data));
          } catch {
            /* a broken file should never break the page */
          }
        }),
      ),
    ).then(() => this.emit({ ready: true }));
    return this.loading;
  }

  play(name: SoundName, { gain = 1, rate = 1, jitter = 0, delay = 0 }: Opts = {}) {
    const ctx = this.ctx;
    const buf = this.buffers.get(name);
    if (!ctx || !buf || !this.master || this.state.muted) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.master);
    src.start(ctx.currentTime + delay);
  }

  hover() {
    const now = performance.now();
    if (now - this.lastHover < 60) return;
    this.lastHover = now;
    this.play('hover', { gain: 0.8, jitter: 0.06 });
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx && !this.state.muted) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  setMuted(muted: boolean) {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
    try {
      localStorage.setItem(KEY, muted ? 'off' : 'on');
    } catch {
      /* ignore */
    }
    this.emit({ muted });
  }
}

let instance: Sfx | null = null;
export function sfx() {
  if (!instance) instance = new Sfx();
  return instance;
}
