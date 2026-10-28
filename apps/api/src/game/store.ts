import { randomUUID } from "node:crypto";
import * as E from "@phantom/case-engine";
// The case travels inside the build (mastra build bundles it), not read from disk at runtime.
import bundle from "../../../../content/cases/vale/case.bundle.json" with { type: "json" };

// case.test.ts checks this file against the case folder, so the cast is safe.
export const vale = bundle as unknown as E.CaseDef;

export type Line = { role: "investigator" | "ghost" | "system"; text: string; at: string; source?: "model" | "scripted"; claims?: string[] };
export type LedgerClaim = E.Claim & { origin: "lie" | "turn" | "challenge" };
export type RelicLive = { type: E.RelicEvent["type"]; at: string; value?: number };

export type Session = {
  id: string;
  state: E.SessionState;
  ledger: LedgerClaim[];
  transcript: Line[];
  /** Evidence bodies written at runtime, e.g. the oracle's report. */
  overrides: Record<string, string>;
  relic: RelicLive[];
  face: E.GhostTurn["face"];
  /** The one-hour warning has been given. */
  warned: boolean;
};

const sessions = new Map<string, Session>();
const now = () => new Date().toISOString();

export function createSession(): Session {
  const id = randomUUID().slice(0, 8);
  const at = now();
  const s: Session = {
    id,
    state: E.newSession(vale),
    // The lies start on the ledger as the Caretaker's own standing claims, citing its own statement.
    ledger: vale.lies.map((l) => ({
      id: `C-${l.id}`, text: l.claim, citations: ["EV-002"], confidence: "high", status: "standing", at, origin: "lie",
    })),
    transcript: [{ role: "ghost", text: "You took your time.", at }],
    overrides: {},
    relic: [],
    face: "watching",
    warned: false,
  };
  sessions.set(id, s);
  return s;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

let studio: Session | undefined;
/**
 * The game always names its session. Mastra Studio and the platform's agent
 * endpoints don't, so they get one shared case file, opened fresh.
 */
export function sessionFor(id?: string): Session {
  const s = id ? getSession(id) : undefined;
  if (s) return s;
  studio ??= createSession();
  return studio;
}

export function evidenceFor(s: Session, id: string) {
  const e = vale.evidence.find((x) => x.id === id);
  if (!e || !s.state.unlocked.includes(id)) return undefined;
  return { ...e, body: s.overrides[id] ?? e.body };
}

export function unlockedEvidence(s: Session) {
  return s.state.unlocked.map((id) => evidenceFor(s, id)!).filter(Boolean);
}

/** What the browser sees. No truths, no proof lists, no per-question verdicts. */
export function view(s: Session) {
  const lies = vale.lies.map((l) => ({ id: l.id, claim: l.claim, standing: !s.state.revised.includes(l.id) }));
  return {
    id: s.id,
    case: { title: vale.title, now: vale.now, deadline: vale.deadline, fiction: vale.fiction },
    evidence: unlockedEvidence(s).map(({ body: _b, unlockedBy: _u, ...brief }) => ({
      ...brief, read: s.state.read.includes(brief.id), pinned: s.state.pinned.includes(brief.id),
    })),
    lies,
    ledger: s.ledger,
    transcript: s.transcript,
    questions: vale.questions.map((q) => ({ id: q.id, prompt: q.prompt, answers: q.answers })),
    theory: s.state.theory,
    clock: { elapsed: E.elapsed(vale, s.state), minutes: vale.clock.minutes },
    endings: E.availableEndings(vale, s.state),
    ending: s.state.ending,
    scanned: s.state.scanned,
    relic: s.relic,
    face: s.face,
  };
}
