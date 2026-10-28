import * as E from "@phantom/case-engine";
import { type Session, vale } from "./store.ts";

const WARN_AT = 60;
const now = () => new Date().toISOString();

/** Keep only the first part of what the Caretaker was saying when the power went. */
export function cutOff(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 4) return `${text.trim()}—`;
  return `${words.slice(0, Math.ceil(words.length * 0.55)).join(" ").replace(/[.,;:!?]+$/, "")}—`;
}

/**
 * Runs after anything that spends time. An hour out, the room tells you.
 * At 00:00 the city cuts the power: whatever the Caretaker was saying stops
 * mid-sentence, and if the case is still open, the clock closes it.
 */
export function tick(s: Session) {
  if (s.state.ending) return;
  const left = vale.clock.minutes - E.elapsed(vale, s.state);
  if (left <= 0) {
    const last = s.transcript.at(-1);
    if (last?.role === "ghost") last.text = cutOff(last.text);
    s.transcript.push({ role: "system", text: "00:00. The city cuts the power to the archive.", at: now() });
    s.state = E.midnight(vale, s.state);
    s.face = "gone";
  } else if (left <= WARN_AT && !s.warned) {
    s.warned = true;
    s.transcript.push({ role: "system", text: "The candle is nearly out. The city cuts the power at midnight, whatever you have filed by then.", at: now() });
  }
}
