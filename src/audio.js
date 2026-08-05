// Every sound is synthesised at runtime. No audio files means no bytes spent on
// them, and nothing to stream — which matters when the whole bundle is capped.

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  const n = ctx.sampleRate * 1.2;
  noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function resumeAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 0.55;
}
export function isMuted() { return muted; }

function env(node, t0, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  node.connect(g);
  g.connect(master);
  return g;
}

function tone(freq, t0, dur, type = 'square', peak = 0.3, slideTo = null) {
  const c = ensure(); if (!c || muted) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  env(o, t0, peak, 0.006, dur);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(t0, dur, freq, q, peak = 0.3) {
  const c = ensure(); if (!c || muted) return;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  s.connect(bp);
  env(bp, t0, peak, 0.008, dur);
  s.start(t0);
  s.stop(t0 + dur + 0.05);
}

const now = () => (ensure() ? ctx.currentTime : 0);

export const sfx = {
  bowl() { noise(now(), 0.1, 900, 1.5, 0.12); },
  flick(p) { noise(now(), 0.07, 1600 + p * 900, 3, 0.16); },
  hit(power, timing) {
    const t = now();
    const bright = timing === 'PERFECT' ? 1.35 : timing === 'GOOD' ? 1 : 0.7;
    noise(t, 0.09, 1400 * bright, 1.2, 0.3);
    tone(180 + power * 2.4, t, 0.09, 'triangle', 0.26 * bright, 90);
  },
  six() {
    const t = now();
    [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.075, 0.12, 'square', 0.2));
    noise(t + 0.1, 0.7, 700, 0.6, 0.16);
  },
  four() {
    const t = now();
    [440, 660].forEach((f, i) => tone(f, t + i * 0.07, 0.11, 'square', 0.18));
    noise(t + 0.08, 0.45, 600, 0.6, 0.1);
  },
  run() { tone(520, now(), 0.07, 'sine', 0.14); },
  wicket() {
    const t = now();
    tone(140, t, 0.22, 'sawtooth', 0.3, 55);
    noise(t, 0.28, 320, 0.8, 0.24);
  },
  dot() { tone(220, now(), 0.06, 'sine', 0.1); },
  tap() { tone(760, now(), 0.04, 'sine', 0.12); },
  win() {
    const t = now();
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.16, 'square', 0.2));
  },
  lose() {
    const t = now();
    [392, 330, 262].forEach((f, i) => tone(f, t + i * 0.13, 0.2, 'triangle', 0.2));
  },
};
