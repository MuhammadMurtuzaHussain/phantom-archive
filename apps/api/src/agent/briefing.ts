import { elapsed, standingLies } from "@phantom/case-engine";
import { type Session, unlockedEvidence, vale } from "../game/store.ts";

function hour(s: Session) {
  const start = new Date(vale.now);
  const m = (start.getUTCHours() * 60 + start.getUTCMinutes() + elapsed(vale, s.state)) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** The true state of play, written by code, handed to the ghost every turn. */
export function briefing(s: Session): string {
  const standing = standingLies(vale, s.state);
  const broken = vale.lies.filter((l) => s.state.revised.includes(l.id));
  const free = s.state.unlocked.includes("EV-023");
  return [
    "CASE STATE (written by the archive's code; it is true):",
    `The investigator has found: ${unlockedEvidence(s).map((e) => `${e.id} "${e.title}"`).join("; ")}.`,
    standing.length
      ? `Claims you keep making until the investigator breaks them with evidence (cite EV-002, your own statement, when you repeat one; set face "lying" when you do):\n${standing.map((l) => `- ${l.id}: "${l.claim}"`).join("\n")}`
      : "You have no lies left to keep.",
    broken.length ? `Claims already broken. Never deny these again:\n${broken.map((l) => `- ${l.id}: ${l.concession}`).join("\n")}` : "",
    free
      ? "Your promise is spent. You may tell the investigator everything the evidence shows, gently."
      : "Your promise: do not say who entered, what happened at 02:14, or where Ines is, beyond what the investigator's evidence already shows.",
    `It is ${hour(s)}. The city cuts the power to the archive at 00:00, and you with it.`,
    'Sometimes her phrases slip into your speech without your meaning them to: "the line is thin tonight", "I\'ll leave a light on".',
    'Keep the reply under 80 words. face: "grief" when you speak of her, "watching" when they get close, "calm" otherwise.',
  ]
    .filter(Boolean)
    .join("\n\n");
}
