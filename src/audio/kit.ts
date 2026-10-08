/**
 * Low-level synthesis helpers shared by the live engine and offline renders.
 * Everything on the site is synthesized: no audio files are shipped.
 */

export type Kit = {
  ctx: BaseAudioContext;
  out: AudioNode;
  /** Optional reverb send. */
  verb?: AudioNode;
  noise: AudioBuffer;
};

const curveCache = new Map<number, Float32Array<ArrayBuffer>>();

/** Soft-clip curve. Higher drive = harder, squarer saturation. */
export function driveCurve(drive: number) {
  const key = Math.round(drive * 100);
  const cached = curveCache.get(key);
  if (cached) return cached;
  const n = 2048;
  const curve = new Float32Array(n);
  const norm = Math.tanh(drive);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / norm;
  }
  curveCache.set(key, curve);
  return curve;
}

export function makeNoise(ctx: BaseAudioContext, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Short, dense room: exponentially decaying stereo noise. */
export function makeImpulse(ctx: BaseAudioContext, seconds = 1.6, decay = 3.2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 90 ? i / 90 : 1);
    }
  }
  return buf;
}

export function gain(k: Kit, value = 1, to: AudioNode = k.out) {
  const g = k.ctx.createGain();
  g.gain.value = value;
  g.connect(to);
  return g;
}

export function filter(
  k: Kit,
  type: BiquadFilterType,
  frequency: number,
  Q = 0.7,
  to?: AudioNode,
) {
  const f = k.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  if (to) f.connect(to);
  return f;
}

export function shaper(k: Kit, drive: number, to?: AudioNode) {
  const s = k.ctx.createWaveShaper();
  s.curve = driveCurve(drive);
  s.oversample = '4x';
  if (to) s.connect(to);
  return s;
}

export function osc(k: Kit, type: OscillatorType, freq: number, to: AudioNode) {
  const o = k.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(to);
  return o;
}

/** Noise source starting at a random offset so repeats never sound identical. */
export function noiseSrc(k: Kit, to: AudioNode, t: number, dur: number) {
  const s = k.ctx.createBufferSource();
  s.buffer = k.noise;
  s.connect(to);
  const offset = Math.random() * Math.max(0, k.noise.duration - dur - 0.05);
  s.start(t, offset, dur + 0.02);
  return s;
}

/** Attack / exponential decay envelope on a gain param. */
export function adEnv(p: AudioParam, t: number, peak: number, attack: number, decay: number) {
  p.cancelScheduledValues(t);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

export const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
