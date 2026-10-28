// Every sound is synthesized in WebAudio: no sample files, nothing to license.
// Audio only starts after a user gesture (the "press enter to connect").

const KEY = "phantom-archive:muted";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let hum: { stop: () => void } | null = null;
let muted = (() => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } })();
const listeners = new Set<(m: boolean) => void>();

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

let noise: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext) {
  if (noise) return noise;
  noise = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

/** A mechanical key: a filtered click on the way down, a soft thump as it bottoms out. */
export function keyClick(kind: "key" | "space" | "enter" | "ghost" = "key") {
  if (muted) return;
  const c = ac();
  const t = c.currentTime;
  const ghost = kind === "ghost";
  const vol = ghost ? 0.12 : kind === "enter" ? 0.55 : 0.35;

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.playbackRate.value = 0.9 + Math.random() * 0.25;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = (kind === "space" || kind === "enter" ? 1800 : 3200) * (ghost ? 0.7 : 1) * (0.9 + Math.random() * 0.2);
  bp.Q.value = 1.4;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + (kind === "enter" ? 0.09 : 0.045));
  src.connect(bp).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.12);

  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(kind === "enter" || kind === "space" ? 95 : 140, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.06);
  const og = c.createGain();
  og.gain.setValueAtTime(vol * 0.6, t + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0008, t + 0.08);
  o.connect(og).connect(master!);
  o.start(t);
  o.stop(t + 0.1);
}

/** The tube warming up: a thunk, then a rising whine that settles. */
export function powerOn() {
  if (muted) return;
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(40, t);
  o.frequency.exponentialRampToValueAtTime(900, t + 0.5);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.7);
  o.connect(lp).connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.75);
  keyClick("enter");
  startHum();
}

/** The city cuts the power: the tube's whine falls away and the hum stops. */
export function powerOff() {
  if (!ctx || !master) return;
  const c = ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(700, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 1.1);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 1.2);
  o.connect(lp).connect(g).connect(master);
  o.start(t);
  o.stop(t + 1.25);
  hum?.stop();
  hum = null;
}

/** Mains hum from the old set, barely there. */
function startHum() {
  if (hum) return;
  const c = ac();
  const o = c.createOscillator();
  o.frequency.value = 50;
  const o2 = c.createOscillator();
  o2.frequency.value = 100;
  const g = c.createGain();
  g.gain.value = 0.018;
  o.connect(g);
  o2.connect(g);
  g.connect(master!);
  o.start();
  o2.start();
  hum = { stop: () => { o.stop(); o2.stop(); } };
}

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(KEY, m ? "1" : "0"); } catch { /* fine */ }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
  if (!m && ctx) startHum();
  listeners.forEach((f) => f(m));
}
export function onMute(f: (m: boolean) => void) { listeners.add(f); return () => { listeners.delete(f); }; }
