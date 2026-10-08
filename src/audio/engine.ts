'use client';
/**
 * FINNERTY sound engine.
 *
 * Signal flow:
 *   ui ─┐
 *   music ─┼─> bus ─> limiter ─> master (volume) ─> analyser ─> speakers
 *   ambient ─┘       ^
 *   verb send ─> convolver ┘
 *
 * The AudioContext only exists after a user gesture (the power key).
 * Before that, every call is a silent no-op so components never need guards.
 */
import { playVoice, VoiceId } from './instruments';
import { adEnv, filter, gain, Kit, makeImpulse, makeNoise, noiseSrc, osc } from './kit';

export const TRACKS: { id: VoiceId; label: string }[] = [
  { id: 'kick', label: 'KICK' },
  { id: 'clap', label: 'CLAP' },
  { id: 'hat', label: 'HAT' },
  { id: 'revbass', label: 'BASS' },
];

const STEPS = 16;

function defaultPattern(): boolean[][] {
  const on = (list: number[]) => Array.from({ length: STEPS }, (_, i) => list.includes(i));
  return [on([0, 4, 8, 12]), on([4, 12]), on([2, 6, 10, 14, 15]), on([2, 3, 6, 7, 10, 11, 14])];
}

type State = {
  ready: boolean;
  muted: boolean;
  volume: number;
  playing: boolean;
  step: number;
  bpm: number;
  pattern: boolean[][];
};

type Listener = (s: State) => void;

const STORE_KEY = 'finnerty:audio';

class Engine {
  ctx: AudioContext | null = null;
  private kit!: Kit;
  private uiKit!: Kit;
  private master!: GainNode;
  private musicBus!: GainNode;
  private ambientBus!: GainNode;
  analyser: AnalyserNode | null = null;
  private humNodes: AudioScheduledSourceNode[] = [];
  private staticGain: GainNode | null = null;
  private whine: GainNode | null = null;
  private slide: { gain: GainNode; bp: BiquadFilterNode } | null = null;
  private lastHover = 0;
  private lastDetent = 0;
  private timer: number | null = null;
  private nextTime = 0;
  private scheduledStep = 0;
  private scratch: {
    fwd: GainNode;
    rev: GainNode;
    srcs: AudioBufferSourceNode[];
  } | null = null;
  private scratchBuffer: Promise<AudioBuffer> | null = null;
  private listeners = new Set<Listener>();
  private hitListeners = new Set<(id: VoiceId) => void>();

  state: State = {
    ready: false,
    muted: false,
    volume: 0.72,
    playing: false,
    step: -1,
    bpm: 150,
    pattern: defaultPattern(),
  };

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
      if (saved && typeof saved.volume === 'number') this.state.volume = saved.volume;
      if (saved && typeof saved.muted === 'boolean') this.state.muted = saved.muted;
    } catch {
      /* storage unavailable */
    }
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  onHit(fn: (id: VoiceId) => void) {
    this.hitListeners.add(fn);
    return () => {
      this.hitListeners.delete(fn);
    };
  }

  private set(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
    if ('volume' in patch || 'muted' in patch) {
      try {
        localStorage.setItem(
          STORE_KEY,
          JSON.stringify({ volume: this.state.volume, muted: this.state.muted }),
        );
      } catch {
        /* ignore */
      }
    }
  }

  /** Must be called from a user gesture. */
  init(silent = false) {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor({ latencyHint: 'interactive' });
    this.ctx = ctx;
    if (silent) this.state.muted = true;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;
    this.analyser.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.connect(this.analyser);
    this.applyVolume(true);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    limiter.connect(this.master);

    const verb = ctx.createConvolver();
    verb.buffer = makeImpulse(ctx, 1.8, 3);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.32;
    verb.connect(verbOut).connect(limiter);

    const noise = makeNoise(ctx, 3);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(limiter);
    const uiBus = ctx.createGain();
    uiBus.gain.value = 0.55;
    uiBus.connect(limiter);
    this.ambientBus = ctx.createGain();
    this.ambientBus.connect(limiter);

    this.kit = { ctx, out: this.musicBus, verb, noise };
    this.uiKit = { ctx, out: uiBus, verb, noise };

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden && !this.state.playing) void this.ctx.suspend();
      else void this.ctx.resume();
    });

    this.set({ ready: true, muted: this.state.muted });
  }

  get now() {
    return this.ctx?.currentTime ?? 0;
  }

  private applyVolume(instant = false) {
    if (!this.ctx) return;
    const v = this.state.muted ? 0 : this.state.volume * this.state.volume;
    const p = this.master.gain;
    if (instant) p.value = v;
    else p.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  setVolume(v: number) {
    this.set({ volume: Math.min(1, Math.max(0, v)) });
    this.applyVolume();
  }

  setMuted(m: boolean) {
    this.set({ muted: m });
    this.applyVolume();
  }

  /* ───────────────────────── interface sounds ───────────────────────── */

  /** Tactile key: firm "thock" on press, lighter tick on release. */
  key(phase: 'down' | 'up' = 'down', weight = 1) {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now;
    const down = phase === 'down';
    const g = gain(k, 0);
    const bp = filter(k, 'bandpass', down ? 2400 : 4200, 1.4, g);
    adEnv(g.gain, t, (down ? 0.5 : 0.28) * weight, 0.0005, down ? 0.025 : 0.014);
    noiseSrc(k, bp, t, 0.04);
    if (down) {
      const b = gain(k, 0);
      adEnv(b.gain, t, 0.3 * weight, 0.001, 0.05);
      const o = osc(k, 'sine', 190 + Math.random() * 20, b);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.05);
      o.start(t);
      o.stop(t + 0.07);
    }
  }

  hover() {
    if (!this.ctx) return;
    const t = this.now;
    if (t - this.lastHover < 0.045) return;
    this.lastHover = t;
    const k = this.uiKit;
    const g = gain(k, 0);
    adEnv(g.gain, t, 0.05, 0.0005, 0.012);
    const o = osc(k, 'sine', 3200 + Math.random() * 300, g);
    o.start(t);
    o.stop(t + 0.02);
  }

  /** Knob detent, pitch follows position so turning has a sense of travel. */
  detent(norm: number) {
    if (!this.ctx) return;
    const t = this.now;
    if (t - this.lastDetent < 0.018) return;
    this.lastDetent = t;
    const k = this.uiKit;
    const g = gain(k, 0);
    const bp = filter(k, 'bandpass', 2600 + norm * 3200, 6, g);
    adEnv(g.gain, t, 0.55, 0.0003, 0.008);
    noiseSrc(k, bp, t, 0.015);
  }

  /** Bat-lever toggle: spring snap + body thunk. */
  toggle(on: boolean) {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now;
    const g = gain(k, 0);
    const hp = filter(k, 'highpass', on ? 2200 : 1700, 0.8, g);
    adEnv(g.gain, t, 0.55, 0.0003, 0.02);
    noiseSrc(k, hp, t, 0.03);
    const ring = gain(k, 0);
    adEnv(ring.gain, t + 0.002, 0.08, 0.0005, 0.09);
    const r = osc(k, 'sine', on ? 3150 : 2700, ring);
    r.start(t);
    r.stop(t + 0.12);
    const body = gain(k, 0);
    adEnv(body.gain, t, 0.35, 0.001, 0.06);
    const b = osc(k, 'sine', 140, body);
    b.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    b.start(t);
    b.stop(t + 0.08);
  }

  /** Mains relay clunk for the power key. */
  relay() {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now;
    const thump = gain(k, 0);
    adEnv(thump.gain, t, 0.9, 0.002, 0.22);
    const o = osc(k, 'sine', 120, thump);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
    o.start(t);
    o.stop(t + 0.25);
    [0, 0.014].forEach((d, i) => {
      const g = gain(k, 0);
      const bp = filter(k, 'bandpass', i ? 5200 : 3400, 2, g);
      adEnv(g.gain, t + d, i ? 0.35 : 0.7, 0.0003, 0.02);
      noiseSrc(k, bp, t + d, 0.03);
    });
    const ring = gain(k, 0, k.verb);
    adEnv(ring.gain, t, 0.12, 0.001, 0.35);
    const r = osc(k, 'triangle', 910, ring);
    r.start(t);
    r.stop(t + 0.4);
  }

  /** Little ascending chirps as the LEDs come online during boot. */
  boot(i: number, at = 0) {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now + at;
    const g = gain(k, 0);
    adEnv(g.gain, t, 0.07, 0.001, 0.05);
    const o = osc(k, 'square', 660 * Math.pow(2, (i % 8) / 12) * (i >= 8 ? 2 : 1), filter(k, 'lowpass', 3500, 0.7, g));
    o.start(t);
    o.stop(t + 0.07);
  }

  /** Mains hum: 50 Hz with harmonics (Belgian grid), plus fan air. Swells on boot then settles. */
  startHum() {
    if (!this.ctx || this.humNodes.length) return;
    const k: Kit = { ...this.uiKit, out: this.ambientBus };
    const t = this.now;
    const out = gain(k, 0);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.05, t + 0.4);
    out.gain.exponentialRampToValueAtTime(0.009, t + 4);
    [50, 100, 150, 250].forEach((f, i) => {
      const o = osc(k, 'sine', f, gain(k, [1, 0.6, 0.25, 0.08][i], out));
      o.frequency.setValueAtTime(f * 0.6, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.9);
      o.start(t);
      this.humNodes.push(o);
    });
    const air = this.ctx.createBufferSource();
    air.buffer = this.kit.noise;
    air.loop = true;
    air.connect(filter(k, 'lowpass', 380, 0.5, gain(k, 0.35, out)));
    air.start(t);
    this.humNodes.push(air);
  }

  plug() {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now;
    const g = gain(k, 0);
    adEnv(g.gain, t, 0.5, 0.0005, 0.03);
    noiseSrc(k, filter(k, 'bandpass', 1800, 1.5, g), t, 0.05);
    const hum = gain(k, 0);
    adEnv(hum.gain, t + 0.01, 0.12, 0.005, 0.25);
    const o = osc(k, 'sawtooth', 50, filter(k, 'lowpass', 400, 0.7, hum));
    o.start(t);
    o.stop(t + 0.3);
  }

  /* ───────────────────────── CRT monitor ───────────────────────── */

  degauss() {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now;
    const g = gain(k, 0, k.verb);
    g.connect(k.out);
    adEnv(g.gain, t, 0.35, 0.01, 0.9);
    const o = osc(k, 'sawtooth', 50, filter(k, 'lowpass', 600, 2, g));
    o.start(t);
    o.stop(t + 1);
    const thunk = gain(k, 0);
    adEnv(thunk.gain, t, 0.6, 0.002, 0.15);
    const b = osc(k, 'sine', 90, thunk);
    b.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    b.start(t);
    b.stop(t + 0.2);
    this.setWhine(true);
  }

  crtOff() {
    if (!this.ctx) return;
    const k = this.uiKit;
    const t = this.now;
    const g = gain(k, 0);
    adEnv(g.gain, t, 0.25, 0.002, 0.25);
    const o = osc(k, 'sine', 900, g);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    o.start(t);
    o.stop(t + 0.3);
    this.setWhine(false);
    this.setStatic(false);
  }

  /** The 15.6 kHz flyback whine every CRT owner remembers. Very quiet. */
  private setWhine(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.whine) {
      const k = { ...this.uiKit, out: this.ambientBus };
      this.whine = gain(k, 0);
      this.whine.gain.setTargetAtTime(0.0035, this.now, 0.4);
      osc(k, 'sine', 15625, this.whine).start();
    } else if (!on && this.whine) {
      const w = this.whine;
      w.gain.setTargetAtTime(0, this.now, 0.05);
      setTimeout(() => w.disconnect(), 400);
      this.whine = null;
    }
  }

  setStatic(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.staticGain) {
      const k = this.uiKit;
      this.staticGain = gain(k, 0);
      this.staticGain.gain.setTargetAtTime(0.06, this.now, 0.08);
      const src = this.ctx.createBufferSource();
      src.buffer = this.kit.noise;
      src.loop = true;
      src.connect(filter(k, 'bandpass', 3800, 0.5, this.staticGain));
      src.start();
    } else if (!on && this.staticGain) {
      const s = this.staticGain;
      s.gain.setTargetAtTime(0, this.now, 0.04);
      setTimeout(() => s.disconnect(), 300);
      this.staticGain = null;
    }
  }

  /* ───────────────────────── fader friction ───────────────────────── */

  /** Continuous slide noise; call with speed 0..1 while dragging, then slideEnd(). */
  slideMove(speed: number) {
    if (!this.ctx) return;
    if (!this.slide) {
      const k = this.uiKit;
      const g = gain(k, 0);
      const bp = filter(k, 'bandpass', 900, 1.2, g);
      const src = this.ctx.createBufferSource();
      src.buffer = this.kit.noise;
      src.loop = true;
      src.connect(bp);
      src.start();
      this.slide = { gain: g, bp };
    }
    const s = Math.min(1, speed);
    this.slide.gain.gain.setTargetAtTime(s * 0.22, this.now, 0.02);
    this.slide.bp.frequency.setTargetAtTime(700 + s * 2600, this.now, 0.02);
  }

  slideEnd() {
    if (!this.slide) return;
    const s = this.slide;
    s.gain.gain.setTargetAtTime(0, this.now, 0.03);
    setTimeout(() => s.gain.disconnect(), 300);
    this.slide = null;
  }

  /* ───────────────────────── instruments ───────────────────────── */

  hit(id: VoiceId, v = 1) {
    if (!this.ctx) return;
    playVoice(this.kit, id, this.now + 0.005, v);
    this.hitListeners.forEach((l) => l(id));
  }

  toggleStep(track: number, step: number) {
    const pattern = this.state.pattern.map((row) => row.slice());
    pattern[track][step] = !pattern[track][step];
    this.set({ pattern });
  }

  clearPattern() {
    this.set({ pattern: this.state.pattern.map((r) => r.map(() => false)) });
  }

  resetPattern() {
    this.set({ pattern: defaultPattern() });
  }

  setBpm(bpm: number) {
    this.set({ bpm: Math.round(Math.min(190, Math.max(120, bpm))) });
  }

  play() {
    if (!this.ctx || this.state.playing) return;
    void this.ctx.resume();
    this.nextTime = this.now + 0.06;
    this.scheduledStep = 0;
    this.set({ playing: true });
    this.timer = window.setInterval(() => this.tick(), 25);
    this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.set({ playing: false, step: -1 });
  }

  private tick() {
    if (!this.ctx) return;
    const stepDur = 60 / this.state.bpm / 4;
    while (this.nextTime < this.now + 0.12) {
      const step = this.scheduledStep;
      const t = this.nextTime;
      TRACKS.forEach((tr, i) => {
        if (this.state.pattern[i][step]) {
          if (tr.id === 'revbass') playVoice(this.kit, 'revbass', t, 1, stepDur * 0.98);
          else playVoice(this.kit, tr.id, t, tr.id === 'hat' && step % 4 === 3 ? 0.6 : 1);
        }
      });
      const delay = Math.max(0, (t - this.now) * 1000);
      window.setTimeout(() => {
        if (this.state.playing) this.set({ step });
      }, delay);
      this.nextTime += stepDur;
      this.scheduledStep = (step + 1) % STEPS;
    }
  }

  /* ───────────────────────── vinyl scratch ───────────────────────── */

  private renderScratchLoop() {
    if (this.scratchBuffer) return this.scratchBuffer;
    const sr = 44100;
    const len = 60 / 150; // one beat at 150 bpm, played as a loop
    const off = new OfflineAudioContext(1, Math.ceil(sr * len * 2), sr);
    const k: Kit = { ctx: off, out: off.destination, noise: makeNoise(off, 2), verb: undefined };
    playVoice(k, 'hey', 0, 1.2);
    playVoice(k, 'stab', 0.05, 1.2);
    playVoice(k, 'kick', len, 0.8);
    playVoice(k, 'hey', len + 0.02, 1);
    this.scratchBuffer = off.startRendering();
    return this.scratchBuffer;
  }

  async scratchStart() {
    if (!this.ctx || this.scratch) return;
    const buf = await this.renderScratchLoop();
    if (!this.ctx || this.scratch) return;
    const rev = this.ctx.createBuffer(1, buf.length, buf.sampleRate);
    const src = buf.getChannelData(0);
    const dst = rev.getChannelData(0);
    for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
    const k = this.uiKit; // not the music bus: that one gets ducked below
    const fwd = gain(k, 0);
    const back = gain(k, 0);
    const srcs = [buf, rev].map((b, i) => {
      const s = this.ctx!.createBufferSource();
      s.buffer = b;
      s.loop = true;
      s.playbackRate.value = 0.0001;
      s.connect(i ? back : fwd);
      s.start();
      return s;
    });
    this.scratch = { fwd, rev: back, srcs };
    // Duck the beat while the record is held, like a DJ riding the platter.
    this.musicBus.gain.setTargetAtTime(0.25, this.now, 0.03);
  }

  /** velocity in "platter turns per second"; sign gives direction. */
  scratchMove(velocity: number) {
    if (!this.scratch || !this.ctx) return;
    const t = this.now;
    const rate = Math.min(3, Math.abs(velocity) / 0.55);
    const audible = rate > 0.04 ? Math.min(1, rate * 1.4) * 1.5 : 0;
    this.scratch.srcs.forEach((s) => s.playbackRate.setTargetAtTime(Math.max(0.0001, rate), t, 0.012));
    this.scratch.fwd.gain.setTargetAtTime(velocity >= 0 ? audible : 0, t, 0.01);
    this.scratch.rev.gain.setTargetAtTime(velocity < 0 ? audible : 0, t, 0.01);
  }

  scratchEnd() {
    if (!this.scratch || !this.ctx) return;
    const s = this.scratch;
    this.scratch = null;
    s.fwd.gain.setTargetAtTime(0, this.now, 0.02);
    s.rev.gain.setTargetAtTime(0, this.now, 0.02);
    setTimeout(() => s.srcs.forEach((x) => x.stop()), 200);
    this.musicBus.gain.setTargetAtTime(1, this.now, 0.06);
  }

  /** RMS level 0..1 for the VU meters. */
  private buf: Float32Array<ArrayBuffer> | null = null;
  level() {
    if (!this.analyser) return 0;
    if (!this.buf) this.buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    return Math.sqrt(sum / this.buf.length);
  }
}

let instance: Engine | null = null;
export function engine() {
  if (!instance) instance = new Engine();
  return instance;
}
export type { Engine, State as EngineState };
