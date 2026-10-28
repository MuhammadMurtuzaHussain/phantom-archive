import { useEffect, useRef } from "react";

// Snow that never stops, drawn over the footage. Three depths: big soft flakes
// close to the lens drift fast, small sharp ones far away fall slowly.

type Flake = { x: number; y: number; r: number; v: number; drift: number; phase: number; a: number };

export function Snow({ density = 1, className = "" }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const g = canvas.getContext("2d")!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, last = performance.now();
    let flakes: Flake[] = [];

    const make = (y?: number): Flake => {
      const depth = Math.random();
      return {
        x: Math.random() * w, y: y ?? Math.random() * h,
        r: 0.6 + depth * depth * 3.4, v: 18 + depth * 70, drift: 6 + depth * 22,
        phase: Math.random() * Math.PI * 2, a: 0.35 + depth * 0.5,
      };
    };
    const size = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.round((w * h) / 6500 * density) }, () => make());
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, w, h);
      for (const f of flakes) {
        if (!still) {
          f.y += f.v * dt;
          f.x += Math.sin(now / 1400 + f.phase) * f.drift * dt;
          if (f.y > h + 6) Object.assign(f, make(-6));
        }
        g.globalAlpha = f.a;
        g.beginPath();
        g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        g.fillStyle = "#eef4f2";
        g.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [density]);
  return <canvas ref={ref} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden />;
}
