import type { Evidence } from "./schema.ts";

// The case engine owns the truth: what the player can see, which lies still
// stand, whether a theory is proven, and which endings are open. Gemma never
// writes to any of this. Every function is pure; state is plain JSON.

export type Lie = { id: string; claim: string; brokenBy: string[]; concession: string };
export type Question = { id: string; prompt: string; answers: Record<string, string>; truth: string; proof: string[] };
/** "midnight" endings can't be chosen: the clock chooses them. */
export type Ending = { id: string; title: string; requires: "none" | "proven" | "midnight"; variants: Record<string, string> };
/** The night in minutes, and what each act costs. Time moves when you act, not while you think. */
export type Clock = { minutes: number; question: number; read: number };

export type CaseDef = {
  id: string;
  title: string;
  now: string;
  deadline: string;
  clock: Clock;
  fiction: string;
  evidence: Evidence[];
  lies: Lie[];
  questions: Question[];
  endings: Ending[];
};

export type SessionState = {
  caseId: string;
  unlocked: string[];
  read: string[];
  pinned: string[];
  revised: string[];
  scanned: boolean;
  relicSeen: boolean;
  /** Questions asked and confrontations made. */
  asked: number;
  theory: Record<string, string>;
  ending: { id: string; title: string; variant: string; text: string } | null;
  log: { at: number; event: string }[];
};

export type Verdict = "proven" | "hunch" | "wrong" | "unanswered";

/** Unlock rules: start · read:EV-x · scan · relic · revise:L1 · all:rule,rule,... */
function ruleMet(rule: string, s: SessionState): boolean {
  if (rule === "start") return true;
  if (rule === "scan") return s.scanned;
  if (rule === "relic") return s.relicSeen;
  if (rule.startsWith("read:")) return s.read.includes(rule.slice(5));
  if (rule.startsWith("revise:")) return s.revised.includes(rule.slice(7));
  if (rule.startsWith("all:")) return rule.slice(4).split(",").every((r) => ruleMet(r.trim(), s));
  return false;
}

/** Unlocking can cascade (all: rules), so repeat until nothing new opens. */
function settle(c: CaseDef, s: SessionState): SessionState {
  let unlocked = s.unlocked;
  for (;;) {
    const next = c.evidence.filter((e) => !unlocked.includes(e.id) && ruleMet(e.unlockedBy, { ...s, unlocked })).map((e) => e.id);
    if (!next.length) return { ...s, unlocked };
    unlocked = [...unlocked, ...next];
  }
}

const note = (s: SessionState, event: string): SessionState => ({ ...s, log: [...s.log, { at: Date.now(), event }] });

export function newSession(c: CaseDef): SessionState {
  return settle(c, {
    caseId: c.id, unlocked: [], read: [], pinned: [], revised: [], scanned: false, relicSeen: false, asked: 0, theory: {}, ending: null, log: [],
  });
}

/** A question or a confrontation costs the night some time. */
export function ask(s: SessionState): SessionState {
  return { ...s, asked: s.asked + 1 };
}

export function elapsed(c: CaseDef, s: SessionState): number {
  return Math.min(c.clock.minutes, s.asked * c.clock.question + s.read.length * c.clock.read);
}

export const nightOver = (c: CaseDef, s: SessionState) => elapsed(c, s) >= c.clock.minutes;

export function readEvidence(c: CaseDef, s: SessionState, id: string): SessionState {
  if (!s.unlocked.includes(id) || s.read.includes(id)) return s;
  return settle(c, note({ ...s, read: [...s.read, id] }, `read ${id}`));
}

export function togglePin(s: SessionState, id: string): SessionState {
  if (!s.unlocked.includes(id)) return s;
  return s.pinned.includes(id) ? { ...s, pinned: s.pinned.filter((p) => p !== id) } : { ...s, pinned: [...s.pinned, id] };
}

export function markScanned(c: CaseDef, s: SessionState): SessionState {
  return s.scanned ? s : settle(c, note({ ...s, scanned: true }, "anomaly scan"));
}

export function markRelic(c: CaseDef, s: SessionState): SessionState {
  return s.relicSeen ? s : settle(c, note({ ...s, relicSeen: true }, "relic stirred"));
}

export type ChallengeResult =
  | { ok: true; lie: Lie; breaker: string; state: SessionState }
  | { ok: false; reason: "unknown-lie" | "already-revised" | "no-breaker"; hint?: string; state: SessionState };

/**
 * The player challenges a standing lie with evidence. Code decides whether the
 * challenge lands: at least one cited item must be unlocked and listed as a breaker.
 */
export function challenge(c: CaseDef, s: SessionState, lieId: string, cited: string[]): ChallengeResult {
  const lie = c.lies.find((l) => l.id === lieId);
  if (!lie) return { ok: false, reason: "unknown-lie", state: s };
  if (s.revised.includes(lieId)) return { ok: false, reason: "already-revised", state: s };
  const breaker = cited.find((id) => s.unlocked.includes(id) && lie.brokenBy.includes(id));
  if (!breaker) return { ok: false, reason: "no-breaker", state: note(s, `challenge ${lieId} held`) };
  return { ok: true, lie, breaker, state: settle(c, note({ ...s, revised: [...s.revised, lieId] }, `challenge ${lieId} broke with ${breaker}`)) };
}

export function standingLies(c: CaseDef, s: SessionState): Lie[] {
  return c.lies.filter((l) => !s.revised.includes(l.id));
}

export function answer(s: SessionState, questionId: string, answerId: string): SessionState {
  return { ...s, theory: { ...s.theory, [questionId]: answerId } };
}

export function scoreTheory(c: CaseDef, s: SessionState) {
  const verdicts = Object.fromEntries(
    c.questions.map((q): [string, Verdict] => {
      const a = s.theory[q.id];
      if (!a) return [q.id, "unanswered"];
      if (a !== q.truth) return [q.id, "wrong"];
      return [q.id, q.proof.some((p) => s.pinned.includes(p)) ? "proven" : "hunch"];
    }),
  );
  const proven = Object.values(verdicts).every((v) => v === "proven");
  return { verdicts, proven };
}

export function availableEndings(c: CaseDef, s: SessionState) {
  const { proven } = scoreTheory(c, s);
  return c.endings.filter((e) => e.requires !== "midnight").map((e) => ({ id: e.id, title: e.title, open: e.requires === "none" || proven }));
}

function close(c: CaseDef, s: SessionState, e: Ending): SessionState {
  const { proven } = scoreTheory(c, s);
  const variant = s.theory.who === "pell" && e.variants["blames-pell"] ? "blames-pell" : proven && e.variants.true ? "true" : "default";
  const text = e.variants[variant] ?? e.variants.default ?? "";
  return note({ ...s, ending: { id: e.id, title: e.title, variant, text } }, `ending ${e.id}/${variant}`);
}

export function chooseEnding(c: CaseDef, s: SessionState, endingId: string): { ok: boolean; state: SessionState } {
  const e = c.endings.find((x) => x.id === endingId);
  if (!e || s.ending || e.requires === "midnight" || nightOver(c, s)) return { ok: false, state: s };
  if (e.requires === "proven" && !scoreTheory(c, s).proven) return { ok: false, state: s };
  return { ok: true, state: close(c, s, e) };
}

/** At 00:00 the city cuts the power. If the case is still open, the clock closes it. */
export function midnight(c: CaseDef, s: SessionState): SessionState {
  const e = c.endings.find((x) => x.requires === "midnight");
  if (!e || s.ending || !nightOver(c, s)) return s;
  return close(c, s, e);
}
