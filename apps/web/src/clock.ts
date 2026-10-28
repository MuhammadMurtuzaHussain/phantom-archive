import type { View } from "./api";

// The archive's night, as the case engine keeps it. It is 09:12 when you connect
// and the city cuts the power at 00:00. Time moves when you act, not while you
// think: a question or a confrontation costs 25 minutes, reading a new file 6.
// The candle on the desk burns down with it.

export const START_MIN = 9 * 60 + 12;

export function clockLabel(v: View): string {
  const m = (START_MIN + v.clock.elapsed) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 0 = a fresh candle, 1 = burnt out. Shared with the 3D desk. */
let burned = 0;
const subs = new Set<(b: number) => void>();
export function setBurned(v: View | null) {
  burned = v ? v.clock.elapsed / v.clock.minutes : 0;
  subs.forEach((f) => f(burned));
}
export const getBurned = () => burned;
export function onBurn(f: (b: number) => void) { subs.add(f); return () => { subs.delete(f); }; }

/** Whether the archive still has power. At midnight the monitor goes dark with it. */
let powered = true;
const powerSubs = new Set<(p: boolean) => void>();
export function setPowered(p: boolean) {
  if (p === powered) return;
  powered = p;
  powerSubs.forEach((f) => f(p));
}
export const isPowered = () => powered;
export function onPower(f: (p: boolean) => void) { powerSubs.add(f); return () => { powerSubs.delete(f); }; }
