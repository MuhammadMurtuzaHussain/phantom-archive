// Sound: recorded effects and ambiences generated with ElevenLabs (public/audio),
// played through WebAudio. The synthesized versions below stay as the fallback
// until the samples load, or if they can't. Audio only starts after a user gesture.

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

// ---- samples ---------------------------------------------------------------

const SAMPLES = [
  "amb-snow", "amb-roof", "amb-room", "crt-hum", "holo-hum", "steps", "hologram-line",
  "key-1", "key-2", "key-3", "key-4", "key-enter", "key-space", "crt-on", "door", "match", "snuff", "power-cut",
] as const;
export type Sample = (typeof SAMPLES)[number];
const buffers = new Map<Sample, AudioBuffer>();
let loading: Promise<void> | null = null;

/** Fetch and decode every sample once. Safe to call repeatedly. */
export function loadSamples() {
  loading ??= Promise.all(SAMPLES.map(async (name) => {
    try {
      const data = await (await fetch(`/audio/${name}.mp3`)).arrayBuffer();
      buffers.set(name, await ac().decodeAudioData(data));
    } catch { /* that one sound falls back or stays silent */ }
  })).then(() => undefined);
  return loading;
}

/** Play a one-shot. Returns how long it lasts, in seconds. */
export function play(name: Sample, { gain = 1, rate = 1, delay = 0 } = {}): number {
  const buf = buffers.get(name);
  if (!buf || muted) return 0;
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master!);
  src.start(c.currentTime + delay);
  return buf.duration / rate;
}

export type Loop = { fade: (to: number, secs?: number) => void; stop: (secs?: number) => void };
const silentLoop: Loop = { fade: () => {}, stop: () => {} };

/** A looping bed (ambience, hum, footsteps) that fades in, and can fade or stop. */
export function loop(name: Sample, gain = 1, fadeIn = 1.5): Loop {
  const buf = buffers.get(name);
  if (!buf) return silentLoop;
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  // MP3 encoders pad both ends; loop inside the padding so the seam doesn't click.
  src.loopStart = Math.min(0.05, buf.duration / 10);
  src.loopEnd = buf.duration - Math.min(0.05, buf.duration / 10);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + fadeIn);
  src.connect(g).connect(master!);
  src.start(c.currentTime, src.loopStart);
  const fade = (to: number, secs = 0.4) => g.gain.setTargetAtTime(Math.max(to, 0.0001), c.currentTime, secs / 3);
  return {
    fade,
    stop: (secs = 1) => { fade(0, secs); src.stop(c.currentTime + secs + 0.1); },
  };
}

let keyTurn = 0;
/** A real key from the four recorded takes, never quite the same twice. */
function sampledKey(kind: "key" | "space" | "enter" | "ghost") {
  const name: Sample = kind === "space" ? "key-space" : kind === "enter" ? "key-enter" : (`key-${(keyTurn++ % 4) + 1}` as Sample);
  if (!buffers.has(name)) return false;
  play(name, { gain: kind === "ghost" ? 0.35 : 0.8, rate: 0.94 + Math.random() * 0.12 });
  return true;
}

// ---- synthesized fallbacks ----------------------------------------------------

/** A mechanical key: a filtered click on the way down, a soft thump as it bottoms out. */
export function keyClick(kind: "key" | "space" | "enter" | "ghost" = "key") {
  if (muted) return;
  if (sampledKey(kind)) return;
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
  if (buffers.has("crt-on")) {
    play("crt-on", { gain: 0.7 });
    startHum();
    return;
  }
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
  if (buffers.has("power-cut")) {
    play("power-cut");
    hum?.stop();
    hum = null;
    return;
  }
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
  if (buffers.has("crt-hum")) {
    const h = loop("crt-hum", 0.5, 2);
    hum = { stop: () => h.stop(0.3) };
    return;
  }
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
