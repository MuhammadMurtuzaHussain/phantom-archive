import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BRIEF, FLAME, GLASS, PLATE, WICK, frame, type Framing } from "./plate";
import { BriefSlot } from "./slot";
import { isGuided, onGuided } from "../guide";
import { mountFlame, type Flame } from "./flame";
import { getBurned, isPowered, onBurn, onPower } from "../clock";
import { loadSamples, loop, play, type Loop } from "../sound";

// The desk at the top of the tower: one photograph, the live terminal on its
// glass, a candle that is actually burning. You lean in to read the screen and
// sit back to see the room.

/** The terminal's own size; it is scaled onto the glass. */
export const SCREEN = { w: 640, h: Math.round((640 * GLASS.h) / GLASS.w) };

export function Desk({ children }: { children: ReactNode }) {
  const [framing, setFraming] = useState<Framing>("close");
  const [view, setView] = useState({ w: innerWidth, h: innerHeight });
  const [lit, setLit] = useState(true);
  const [powered, setPowered] = useState(isPowered());
  const [smoke, setSmoke] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const flame = useRef<Flame | null>(null);
  const world = useRef<HTMLDivElement>(null);
  const edgeTimer = useRef<number | undefined>(undefined);
  const [guided, setGuidedState] = useState(isGuided());
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => onGuided(setGuidedState), []);

  useEffect(() => {
    const r = () => setView({ w: innerWidth, h: innerHeight });
    addEventListener("resize", r);
    return () => removeEventListener("resize", r);
  }, []);

  // The room's sound: rain on the window under everything.
  useEffect(() => {
    let bed: Loop | undefined;
    void loadSamples().then(() => { bed = loop("amb-room", 0.45, 3); });
    return () => bed?.stop(1);
  }, []);

  // The flame shader needs the photo decoded first.
  useLayoutEffect(() => {
    const img = new Image();
    img.src = PLATE.src;
    let raf = 0;
    void img.decode().then(() => {
      flame.current = mountFlame(canvas.current!, img);
      // The warm light around the desk breathes with the flame.
      const tick = () => {
        if (glow.current && flame.current) glow.current.style.opacity = String(flame.current.glow());
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }).catch(() => {});
    return () => { cancelAnimationFrame(raf); flame.current?.dispose(); flame.current = null; };
  }, []);

  useEffect(() => { flame.current?.setLit(lit && powered); }, [lit, powered]);
  // At midnight the candle has burned down; the city takes the rest.
  useEffect(() => onBurn((b) => { if (b >= 1) setLit(false); }), []);
  useEffect(() => onPower(setPowered), []);
  useEffect(() => { if (getBurned() >= 1) setLit(false); }, []);

  const f = frame(framing, view.w, view.h, guided);
  const toPlate = (cx: number, cy: number) => ({ x: (cx - f.x) / f.s, y: (cy - f.y) / f.s });

  const onMove = (e: React.PointerEvent) => {
    // The flame leans away from the cursor, more the closer it gets.
    const p = toPlate(e.clientX, e.clientY);
    const fx = FLAME.x + WICK.x, fy = FLAME.y + WICK.tip;
    const d = Math.hypot(p.x - fx, p.y - fy);
    flame.current?.setLean(d < 420 ? Math.sign(fx - p.x) * (1 - d / 420) : 0);
    // Rest at the left edge to sit back and see the candle.
    clearTimeout(edgeTimer.current);
    if (e.clientX < view.w * 0.06 && framing === "close") edgeTimer.current = window.setTimeout(() => setFraming("wide"), 450);
  };

  const toggleCandle = () => {
    if (!powered && !lit) return;
    if (lit) { play("snuff", { gain: 0.9 }); setSmoke((n) => n + 1); }
    else play("match", { gain: 0.9 });
    setLit(!lit);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" onPointerMove={onMove}>
      <div
        ref={world}
        className="absolute left-0 top-0 origin-top-left transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: PLATE.w, height: PLATE.h, transform: `translate(${f.x}px, ${f.y}px) scale(${f.s})` }}
      >
        <img src={PLATE.src} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />

        {/* The flame is redrawn live under the room's light, so the light falls on it too. */}
        <canvas ref={canvas} onClick={toggleCandle} title={lit ? "Snuff the candle" : "Light the candle"}
          className="absolute cursor-pointer" style={{ left: FLAME.x, top: FLAME.y, width: FLAME.w, height: FLAME.h }} />
        {/* Candlelight on the desk, flickering with the flame. */}
        <div ref={glow} className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-700"
          style={{ background: `radial-gradient(circle 900px at ${FLAME.x + WICK.x}px ${FLAME.y + WICK.y - 20}px, rgb(255 168 88 / 0.16), transparent 70%)` }} />
        {/* With the candle out, the warm side of the room falls into shadow. */}
        <div className={`pointer-events-none absolute inset-0 transition-opacity duration-[1400ms] ${lit && powered ? "opacity-0" : "opacity-100"}`}
          style={{ background: `radial-gradient(circle 1100px at ${FLAME.x + WICK.x}px ${FLAME.y + WICK.y}px, rgb(4 6 10 / 0.55), rgb(4 6 10 / 0.2) 75%, transparent)` }} />

        {smoke > 0 && <span key={smoke} className="candle-smoke pointer-events-none absolute" style={{ left: FLAME.x + WICK.x - 14, top: FLAME.y + WICK.y - 60 }} />}

        {/* The glass: the live terminal behind the photo's own reflections. */}
        <div className="absolute overflow-hidden" onClick={() => setFraming("close")}
          style={{ left: GLASS.x, top: GLASS.y, width: GLASS.w, height: GLASS.h, borderRadius: GLASS.radius }}>
          <div className="origin-top-left" style={{ width: SCREEN.w, height: SCREEN.h, transform: `scale(${GLASS.w / SCREEN.w})` }}>
            <BriefSlot.Provider value={guided ? slot : null}>{children}</BriefSlot.Provider>
          </div>
          <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-30"
            style={{ backgroundImage: `url(${PLATE.src})`, backgroundSize: `${PLATE.w}px ${PLATE.h}px`, backgroundPosition: `-${GLASS.x}px -${GLASS.y}px` }} />
          <div className="pointer-events-none absolute inset-0" style={{ borderRadius: GLASS.radius, boxShadow: "inset 0 0 60px 18px rgb(0 0 0 / 0.65), inset 0 0 8px 2px rgb(0 0 0 / 0.8)" }} />
        </div>

        {/* The guided brief, taped to the monitor. Its contents come from the game, through a portal. */}
        {guided && (
          <div ref={setSlot} className="brief-paper absolute" style={{ left: BRIEF.x, top: BRIEF.y, width: BRIEF.w, height: BRIEF.h, fontSize: 9.6 }} />
        )}

        {/* After midnight the city's power is gone; only what light is left in the room. */}
        <div className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-[2500ms] ${powered ? "opacity-0" : "opacity-55"}`} />
      </div>

      <button onClick={() => setFraming(framing === "close" ? "wide" : "close")}
        className="absolute bottom-5 left-6 text-[11px] uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white/85">
        {framing === "close" ? "Sit back" : "Lean in"}
      </button>
    </div>
  );
}
