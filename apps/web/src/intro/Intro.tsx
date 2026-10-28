import { useCallback, useEffect, useRef, useState } from "react";
import { Snow } from "./Snow";
import { loadSamples, loop, play, type Loop, type Sample } from "../sound";

// The way in: the investigator lies down in the snow outside the archive, wakes
// on a rooftop in 2049, walks past the Vale hologram and sits down at the
// terminal. Filmed shots (public/intro); the two walks only move while you hold.

const SEEN = "phantom-archive:intro-seen";
export const introSeen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN, "1"); } catch { /* private window */ } };

type Shot = {
  kind: "shot";
  src: string;
  walk?: boolean;
  snow?: number;
  /** The ambience bed this shot settles into. */
  bed?: Sample;
  /** Fade to white instead of black at the end. */
  white?: boolean;
  /** A line spoken over the shot, with its caption. */
  line?: { sample: Sample; at: number; caption: string[] };
};
type Card = { kind: "card"; lines: string[]; ms: number };
type Step = Shot | Card;

const STEPS: Step[] = [
  { kind: "shot", src: "01-snow", snow: 1, bed: "amb-snow" },
  { kind: "shot", src: "02-overhead", snow: 1.5, bed: "amb-snow", white: true },
  { kind: "card", lines: ["31 October 2049", "09:12"], ms: 3400 },
  { kind: "shot", src: "03-wake", bed: "amb-roof" },
  { kind: "shot", src: "04-walk", walk: true, bed: "amb-roof" },
  {
    kind: "shot", src: "05-hologram", bed: "amb-roof",
    line: { sample: "hologram-line", at: 0, caption: ["You look lonely.", "I'll leave a light on."] },
  },
  { kind: "shot", src: "07-door", walk: true, bed: "amb-room" },
  { kind: "shot", src: "08-sit", bed: "amb-room" },
];

const shotUrl = (src: string) => `/intro/${src}.mp4`;
const FADE_MS = 700;

export function Intro({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [fading, setFading] = useState<"black" | "white" | null>(null);
  const [holding, setHolding] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const beds = useRef(new Map<Sample, Loop>());
  const steps = useRef<Loop | null>(null);
  const hum = useRef<Loop | null>(null);
  const step = STEPS[i]!;

  const finish = useCallback(() => {
    markSeen();
    for (const b of beds.current.values()) b.stop(2);
    steps.current?.stop(0.3);
    hum.current?.stop(1);
    onDone();
  }, [onDone]);

  const next = useCallback((white = false) => {
    setFading(white ? "white" : "black");
    setTimeout(() => {
      setCaption(null);
      setHolding(false);
      if (i + 1 >= STEPS.length) return finish();
      setI(i + 1);
      setFading(null);
    }, FADE_MS);
  }, [i, finish]);

  // Keep only the current shot's ambience playing, crossfading between beds.
  useEffect(() => {
    if (!started || step.kind !== "shot" || !step.bed) return;
    const want = step.bed;
    for (const [name, b] of beds.current) if (name !== want) { b.stop(2); beds.current.delete(name); }
    if (!beds.current.has(want)) beds.current.set(want, loop(want, want === "amb-room" ? 0.55 : 0.8, 2));
  }, [started, step]);

  // Title cards hold, then move on.
  useEffect(() => {
    if (!started || step.kind !== "card") return;
    const t = setTimeout(() => next(), step.ms);
    return () => clearTimeout(t);
  }, [started, step, next]);

  // Plain shots play through; walks wait for the player. Lines and the hologram's hum ride on the shot.
  useEffect(() => {
    if (!started || step.kind !== "shot") return;
    const v = video.current!;
    v.currentTime = 0;
    if (!step.walk) void v.play().catch(() => {});
    if (step.src === "04-walk") hum.current ??= loop("holo-hum", 0.05, 0.5);
    if (step.src === "07-door") { hum.current?.stop(3); hum.current = null; play("door", { gain: 0.8 }); }
    const timers: number[] = [];
    if (step.line) {
      const [a, b] = step.line.caption;
      timers.push(window.setTimeout(() => { play(step.line!.sample); setCaption(a!); }, step.line.at * 1000));
      timers.push(window.setTimeout(() => setCaption(b!), (step.line.at + 1.9) * 1000));
      timers.push(window.setTimeout(() => setCaption(null), (step.line.at + 5.2) * 1000));
    }
    const progress = () => {
      // The hologram grows louder as you walk toward her.
      if (step.src === "04-walk" && v.duration) hum.current?.fade(0.05 + 0.6 * (v.currentTime / v.duration), 0.3);
    };
    const ended = () => next(step.white);
    v.addEventListener("timeupdate", progress);
    v.addEventListener("ended", ended);
    return () => { timers.forEach(clearTimeout); v.removeEventListener("timeupdate", progress); v.removeEventListener("ended", ended); };
  }, [started, step, next]);

  // Hold to walk: the footage and the footsteps move only while you hold.
  useEffect(() => {
    if (!started || step.kind !== "shot" || !step.walk) return;
    const v = video.current!;
    if (holding) {
      void v.play().catch(() => {});
      steps.current ??= loop("steps", 0.7, 0.25);
      steps.current.fade(0.7, 0.25);
    } else {
      v.pause();
      steps.current?.fade(0, 0.25);
    }
  }, [started, step, holding]);

  useEffect(() => {
    if (!started) return;
    const walkKey = (e: KeyboardEvent) => ["KeyW", "ArrowUp", "Space"].includes(e.code);
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") return finish();
      if (walkKey(e)) { e.preventDefault(); setHolding(true); }
    };
    const up = (e: KeyboardEvent) => { if (walkKey(e)) setHolding(false); };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, [started, finish]);

  // The landing waits for a key or a click: browsers only allow sound after one.
  useEffect(() => {
    if (started) return;
    const go = () => {
      void Promise.race([loadSamples(), new Promise((ok) => setTimeout(ok, 2500))]).then(() => setStarted(true));
    };
    const key = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey) go(); };
    addEventListener("keydown", key, { once: true });
    addEventListener("pointerdown", go, { once: true });
    return () => { removeEventListener("keydown", key); removeEventListener("pointerdown", go); };
  }, [started]);

  const nextShot = STEPS.slice(i + 1).find((s): s is Shot => s.kind === "shot");
  const isWalk = started && step.kind === "shot" && step.walk;

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden bg-black"
      onPointerDown={() => isWalk && setHolding(true)}
      onPointerUp={() => setHolding(false)}
      onPointerLeave={() => setHolding(false)}
    >
      {step.kind === "shot" && (
        <video key={step.src} ref={video} src={shotUrl(step.src)} muted playsInline preload="auto"
          className={`absolute inset-0 h-full w-full object-cover ${started ? "" : "grayscale-[35%] brightness-75"}`} />
      )}
      {/* Load the next shot while this one plays, so the cut is instant. */}
      {nextShot && <video key={`pre-${nextShot.src}`} src={shotUrl(nextShot.src)} muted preload="auto" className="hidden" />}

      {step.kind === "shot" && step.snow && <Snow density={step.snow} />}
      {!started && <Snow density={1.2} />}

      {step.kind === "card" && (
        <div className="intro-card absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#e8efec]">
          {step.lines.map((l, n) => (
            <p key={l} className="font-light uppercase tracking-[0.55em]" style={{ animationDelay: `${n * 600}ms`, fontSize: n === 0 ? "clamp(0.9rem,1.6vw,1.25rem)" : "clamp(0.75rem,1.1vw,0.95rem)" }}>{l}</p>
          ))}
        </div>
      )}

      {caption && (
        <p className="intro-caption absolute inset-x-0 bottom-[9vh] text-center text-[clamp(1rem,1.8vw,1.4rem)] text-[#f3eadf] [text-shadow:0_1px_12px_rgb(0_0_0/0.9)]">{caption}</p>
      )}

      {!started && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/10 to-transparent px-[clamp(1.5rem,7vw,7rem)] pb-[clamp(2rem,10vh,7rem)] text-[#e8efec]">
          <p className="text-[clamp(0.7rem,0.9vw,0.8rem)] uppercase tracking-[0.5em] text-[#9fb4ad]">Case 001 · The Vale Archive</p>
          <h1 className="mt-4 font-light uppercase leading-none tracking-[0.42em] text-[clamp(1.8rem,5vw,4.2rem)]">Phantom Archive</h1>
          <p className="mt-6 max-w-[46ch] text-[clamp(0.85rem,1.05vw,1rem)] leading-relaxed text-[#b9c8c3]">31 October 2049. The archive shuts down at midnight. Someone went in last night. The archive says no one did.</p>
          <p className="intro-pulse mt-10 text-[clamp(0.75rem,0.9vw,0.85rem)] uppercase tracking-[0.4em] text-[#e8efec]">Press any key</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-[#6f827c]">Headphones recommended · sound on</p>
        </div>
      )}

      {isWalk && !holding && (
        <p className="intro-pulse absolute inset-x-0 bottom-[8vh] text-center text-[clamp(0.7rem,0.9vw,0.82rem)] uppercase tracking-[0.4em] text-[#e8efec]/85">Hold W, or hold the mouse, to walk</p>
      )}

      {started && (
        <button onClick={finish} className="absolute bottom-6 right-7 text-[11px] uppercase tracking-[0.3em] text-white/45 transition-colors hover:text-white/90">Skip intro · esc</button>
      )}

      <div className={`pointer-events-none absolute inset-0 transition-opacity ${fading === "white" ? "bg-[#eef3f1]" : "bg-black"} ${fading ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${FADE_MS}ms` }} />
    </div>
  );
}
