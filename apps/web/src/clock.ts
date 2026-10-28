import type { View } from "./api";

// The archive's night. It is 09:12 when you connect and the city cuts the power
// at 00:00, 888 minutes later. Time moves when you act, not while you think:
// a question costs 25 minutes, reading a new file 6. The candle on the desk
// burns down with it. Derived from the session, so a resumed case resumes the clock.

export const START_MIN = 9 * 60 + 12;
export const NIGHT_MIN = 24 * 60 - START_MIN;

export function elapsed(v: View): number {
  const asked = v.transcript.filter((l) => l.role === "investigator").length;
  const read = v.evidence.filter((e) => e.read).length;
  return Math.min(NIGHT_MIN, asked * 25 + read * 6);
}

export function clockLabel(v: View): string {
  const m = (START_MIN + elapsed(v)) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 0 = a fresh candle, 1 = burnt out. Shared with the 3D desk. */
let burned = 0;
const subs = new Set<(b: number) => void>();
export function setBurned(v: View | null) {
  burned = v ? elapsed(v) / NIGHT_MIN : 0;
  subs.forEach((f) => f(burned));
}
export const getBurned = () => burned;
export function onBurn(f: (b: number) => void) { subs.add(f); return () => { subs.delete(f); }; }
