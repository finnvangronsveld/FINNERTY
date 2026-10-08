/**
 * The drum machine voices. Tuned to G minor so every pad sits in one key.
 * Each voice schedules itself at time `t` on the given kit and cleans up
 * after itself (sources stop, nodes are released by GC).
 */
import { adEnv, filter, gain, Kit, midi, noiseSrc, osc, shaper } from './kit';

export type VoiceId =
  | 'kick'
  | 'clap'
  | 'snare'
  | 'rim'
  | 'hat'
  | 'openhat'
  | 'tom'
  | 'crash'
  | 'revbass'
  | 'screech'
  | 'stab'
  | 'hey'
  | 'horn'
  | 'riser'
  | 'subdrop'
  | 'zap';

const ROOT = 31; // G1

let openHatGain: GainNode | null = null;

function kick(k: Kit, t: number, v = 1) {
  // Distorted pitch-swept sine: the hardstyle "punch + tail".
  const out = gain(k, 0.55 * v);
  const lp = filter(k, 'lowpass', 5200, 0.8, out);
  const hp = filter(k, 'highpass', 32, 0.7, lp);
  const drive = shaper(k, 9, hp);
  const amp = k.ctx.createGain();
  amp.connect(drive);
  const o = osc(k, 'sine', 400, amp);
  const end = midi(ROOT);
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.018);
  o.frequency.exponentialRampToValueAtTime(end * 1.25, t + 0.09);
  o.frequency.exponentialRampToValueAtTime(end, t + 0.32);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(1.15, t + 0.002);
  amp.gain.setValueAtTime(1, t + 0.16);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.start(t);
  o.stop(t + 0.52);
  // Transient click
  const cg = gain(k, 0);
  const chp = filter(k, 'highpass', 2600, 0.7, cg);
  adEnv(cg.gain, t, 0.35 * v, 0.0005, 0.012);
  noiseSrc(k, chp, t, 0.02);
}

function clap(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.5 * v);
  if (k.verb) out.connect(gain(k, 0.35, k.verb));
  const bp = filter(k, 'bandpass', 1150, 1.1, out);
  const amp = k.ctx.createGain();
  amp.connect(bp);
  const g = amp.gain;
  g.setValueAtTime(0.0001, t);
  [0, 0.011, 0.023].forEach((o) => {
    g.setValueAtTime(1, t + o);
    g.exponentialRampToValueAtTime(0.12, t + o + 0.009);
  });
  g.setValueAtTime(0.9, t + 0.031);
  g.exponentialRampToValueAtTime(0.0001, t + 0.22);
  noiseSrc(k, amp, t, 0.25);
}

function snare(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.45 * v);
  if (k.verb) out.connect(gain(k, 0.25, k.verb));
  const ng = k.ctx.createGain();
  ng.connect(filter(k, 'bandpass', 2600, 0.9, out));
  adEnv(ng.gain, t, 0.9, 0.001, 0.16);
  noiseSrc(k, ng, t, 0.2);
  const tg = k.ctx.createGain();
  tg.connect(out);
  adEnv(tg.gain, t, 0.7, 0.001, 0.09);
  const o = osc(k, 'triangle', 210, tg);
  o.frequency.exponentialRampToValueAtTime(165, t + 0.06);
  o.start(t);
  o.stop(t + 0.12);
}

function rim(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.32 * v);
  const hp = filter(k, 'highpass', 600, 0.7, out);
  const g = k.ctx.createGain();
  g.connect(hp);
  adEnv(g.gain, t, 1, 0.0005, 0.045);
  const a = osc(k, 'triangle', 1680, g);
  const b = osc(k, 'square', 470, g);
  a.start(t);
  b.start(t);
  a.stop(t + 0.06);
  b.stop(t + 0.06);
}

function hat(k: Kit, t: number, v = 1, open = false) {
  if (openHatGain) {
    // Closed hat chokes the open one, like on real machines.
    openHatGain.gain.cancelScheduledValues(t);
    openHatGain.gain.setTargetAtTime(0.0001, t, 0.008);
    openHatGain = null;
  }
  const out = gain(k, (open ? 0.22 : 0.26) * v);
  const hp = filter(k, 'highpass', 7600, 0.8, out);
  const pk = filter(k, 'peaking', 10500, 2, hp);
  pk.gain.value = 6;
  const g = k.ctx.createGain();
  g.connect(pk);
  const len = open ? 0.34 : 0.045;
  adEnv(g.gain, t, 1, 0.001, len);
  noiseSrc(k, g, t, len + 0.05);
  if (open) openHatGain = g;
}

function tom(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.55 * v);
  if (k.verb) out.connect(gain(k, 0.2, k.verb));
  const g = k.ctx.createGain();
  g.connect(out);
  adEnv(g.gain, t, 1, 0.002, 0.32);
  const o = osc(k, 'sine', midi(ROOT + 24) * 1.5, g);
  o.frequency.exponentialRampToValueAtTime(midi(ROOT + 24) * 0.75, t + 0.3);
  o.start(t);
  o.stop(t + 0.36);
}

function crash(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.2 * v);
  if (k.verb) out.connect(gain(k, 0.4, k.verb));
  const hp = filter(k, 'highpass', 4200, 0.6, out);
  const bp = filter(k, 'bandpass', 7800, 0.6, hp);
  const g = k.ctx.createGain();
  g.connect(bp);
  g.connect(hp);
  adEnv(g.gain, t, 1, 0.002, 1.7);
  noiseSrc(k, g, t, 1.75);
}

/** Offbeat "reverse bass": envelope swells up then cuts, like a reversed kick tail. */
function revbass(k: Kit, t: number, v = 1, len = 0.19) {
  const out = gain(k, 0.3 * v);
  const lp = filter(k, 'lowpass', 220, 4, out);
  lp.frequency.setValueAtTime(180, t);
  lp.frequency.exponentialRampToValueAtTime(1900, t + len);
  const drive = shaper(k, 4, lp);
  const g = k.ctx.createGain();
  g.connect(drive);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + len * 0.92);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  const f = midi(ROOT + 12);
  const a = osc(k, 'sawtooth', f, g);
  const b = osc(k, 'sawtooth', f * 1.006, g);
  const s = osc(k, 'sine', f / 2, g);
  [a, b, s].forEach((o) => {
    o.start(t);
    o.stop(t + len + 0.01);
  });
}

function screech(k: Kit, t: number, v = 1) {
  const len = 0.55;
  const out = gain(k, 0.16 * v);
  if (k.verb) out.connect(gain(k, 0.3, k.verb));
  const lp = filter(k, 'lowpass', 7000, 0.7, out);
  const bp = filter(k, 'bandpass', 1300, 5, lp);
  bp.frequency.setValueAtTime(900, t);
  bp.frequency.exponentialRampToValueAtTime(3600, t + 0.18);
  bp.frequency.exponentialRampToValueAtTime(1400, t + len);
  const drive = shaper(k, 6, bp);
  const g = k.ctx.createGain();
  g.connect(drive);
  adEnv(g.gain, t, 1, 0.01, len);
  const base = midi(ROOT + 36 + 7);
  const depth = k.ctx.createGain();
  depth.gain.value = base * 0.06;
  const lfo = osc(k, 'sine', 9, depth);
  const voices = [osc(k, 'sawtooth', base, g), osc(k, 'square', base * 1.503, g), osc(k, 'sawtooth', base * 0.996, g)];
  voices.forEach((o) => {
    o.frequency.setValueAtTime(o.frequency.value * 0.7, t);
    o.frequency.exponentialRampToValueAtTime(o.frequency.value, t + 0.07);
    depth.connect(o.frequency);
    o.start(t);
    o.stop(t + len + 0.02);
  });
  lfo.frequency.setValueAtTime(4, t);
  lfo.frequency.linearRampToValueAtTime(14, t + len);
  lfo.start(t);
  lfo.stop(t + len + 0.02);
}

/** Detuned supersaw minor chord, the euphoric hardstyle lead stab. */
function stab(k: Kit, t: number, v = 1) {
  const len = 0.6;
  const out = gain(k, 0.045 * v);
  if (k.verb) out.connect(gain(k, 0.9, k.verb));
  const lp = filter(k, 'lowpass', 6000, 1.2, out);
  lp.frequency.setValueAtTime(7500, t);
  lp.frequency.exponentialRampToValueAtTime(900, t + len);
  const g = k.ctx.createGain();
  g.connect(lp);
  adEnv(g.gain, t, 1, 0.004, len);
  const chord = [ROOT + 36, ROOT + 39, ROOT + 43, ROOT + 48];
  const detune = [-21, -11, -4, 0, 5, 12, 22];
  chord.forEach((n) =>
    detune.forEach((c) => {
      const o = osc(k, 'sawtooth', midi(n), g);
      o.detune.value = c;
      o.start(t + Math.random() * 0.004);
      o.stop(t + len + 0.02);
    }),
  );
}

/** Formant-synth "HEY!": breath noise into a moving vowel. */
function hey(k: Kit, t: number, v = 1) {
  const len = 0.36;
  const out = gain(k, 0.5 * v);
  if (k.verb) out.connect(gain(k, 0.35, k.verb));
  const formants: [number, number, number, number][] = [
    // [start Hz, end Hz, Q, level]
    [700, 420, 9, 1],
    [1750, 2150, 12, 0.55],
    [2450, 2650, 14, 0.3],
  ];
  const src = k.ctx.createGain();
  formants.forEach(([a, b, q, lvl]) => {
    const f = filter(k, 'bandpass', a, q, gain(k, lvl * 3, out));
    f.frequency.setValueAtTime(a, t + 0.04);
    f.frequency.exponentialRampToValueAtTime(b, t + len);
    src.connect(f);
  });
  src.gain.setValueAtTime(0.0001, t);
  src.gain.linearRampToValueAtTime(1, t + 0.05);
  src.gain.setValueAtTime(1, t + len * 0.6);
  src.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const g = k.ctx.createGain();
  g.connect(src);
  const voice = osc(k, 'sawtooth', 190, g);
  voice.frequency.setValueAtTime(205, t);
  voice.frequency.linearRampToValueAtTime(165, t + len);
  voice.start(t + 0.03);
  voice.stop(t + len + 0.02);
  const breath = k.ctx.createGain();
  breath.connect(src);
  adEnv(breath.gain, t, 0.35, 0.01, 0.07);
  noiseSrc(k, breath, t, 0.1);
}

function hornBlast(k: Kit, t: number, len: number, v: number) {
  const out = gain(k, 0.11 * v);
  if (k.verb) out.connect(gain(k, 0.3, k.verb));
  const bp = filter(k, 'bandpass', 1500, 0.9, out);
  const drive = shaper(k, 3, bp);
  const g = k.ctx.createGain();
  g.connect(drive);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(1, t + 0.015);
  g.gain.setValueAtTime(1, t + len - 0.03);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  [466.16, 469.5, 698.46, 932.3].forEach((f, i) => {
    const o = osc(k, 'sawtooth', f, gain(k, i === 3 ? 0.4 : 1, g));
    o.frequency.setValueAtTime(f * 0.93, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    o.start(t);
    o.stop(t + len + 0.01);
  });
}

function horn(k: Kit, t: number, v = 1) {
  hornBlast(k, t, 0.13, v);
  hornBlast(k, t + 0.17, 0.13, v);
  hornBlast(k, t + 0.34, 0.6, v);
}

function riser(k: Kit, t: number, v = 1) {
  const len = 1.6;
  const out = gain(k, 0.32 * v);
  if (k.verb) out.connect(gain(k, 0.5, k.verb));
  const bp = filter(k, 'bandpass', 300, 3.5, out);
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.exponentialRampToValueAtTime(9000, t + len);
  const g = k.ctx.createGain();
  g.connect(bp);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + len * 0.95);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  noiseSrc(k, g, t, len);
  const sg = k.ctx.createGain();
  sg.gain.value = 0.18;
  sg.connect(g);
  const o = osc(k, 'sawtooth', 180, sg);
  o.frequency.exponentialRampToValueAtTime(1400, t + len);
  o.start(t);
  o.stop(t + len);
}

function subdrop(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.6 * v);
  const g = k.ctx.createGain();
  g.connect(shaper(k, 1.6, out));
  adEnv(g.gain, t, 1, 0.01, 1.5);
  const o = osc(k, 'sine', 95, g);
  o.frequency.exponentialRampToValueAtTime(27, t + 1.45);
  o.start(t);
  o.stop(t + 1.55);
}

function zap(k: Kit, t: number, v = 1) {
  const out = gain(k, 0.12 * v);
  if (k.verb) out.connect(gain(k, 0.3, k.verb));
  const lp = filter(k, 'lowpass', 5000, 6, out);
  lp.frequency.setValueAtTime(6000, t);
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.22);
  const g = k.ctx.createGain();
  g.connect(lp);
  adEnv(g.gain, t, 1, 0.001, 0.22);
  const o = osc(k, 'square', 2600, g);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.22);
  o.start(t);
  o.stop(t + 0.25);
}

export function playVoice(k: Kit, id: VoiceId, t: number, v = 1, len?: number) {
  switch (id) {
    case 'kick':
      return kick(k, t, v);
    case 'clap':
      return clap(k, t, v);
    case 'snare':
      return snare(k, t, v);
    case 'rim':
      return rim(k, t, v);
    case 'hat':
      return hat(k, t, v, false);
    case 'openhat':
      return hat(k, t, v, true);
    case 'tom':
      return tom(k, t, v);
    case 'crash':
      return crash(k, t, v);
    case 'revbass':
      return revbass(k, t, v, len);
    case 'screech':
      return screech(k, t, v);
    case 'stab':
      return stab(k, t, v);
    case 'hey':
      return hey(k, t, v);
    case 'horn':
      return horn(k, t, v);
    case 'riser':
      return riser(k, t, v);
    case 'subdrop':
      return subdrop(k, t, v);
    case 'zap':
      return zap(k, t, v);
  }
}
