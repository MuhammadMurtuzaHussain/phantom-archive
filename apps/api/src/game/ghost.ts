import { GhostTurn, ask, checkCitations, elapsed, standingLies } from "@phantom/case-engine";
import { RequestContext } from "@mastra/core/request-context";
import { caretaker } from "../agent/caretaker.ts";
import { noThinking } from "../agent/model.ts";
import { type LedgerClaim, type Session, vale } from "./store.ts";

const TURN_TIMEOUT_MS = 90_000;
const now = () => new Date().toISOString();

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

/** One Gemma turn, validated. Throws if the model is unreachable or returns nothing usable. */
export async function speak(s: Session, prompt: string, history = true) {
  const past = history
    ? s.transcript.slice(-8).filter((l) => l.role !== "system").map((l) => (l.role === "ghost" ? { role: "assistant" as const, content: l.text } : { role: "user" as const, content: l.text }))
    : [];
  const requestContext = new RequestContext([["sessionId", s.id]]);
  const res = await caretaker.generate([...past, { role: "user" as const, content: prompt }], {
    maxSteps: 6,
    modelSettings: { temperature: 0.5 },
    providerOptions: noThinking,
    abortSignal: AbortSignal.timeout(TURN_TIMEOUT_MS),
    requestContext,
    // Traces in the Mastra dashboard can be filtered by game session and by the archive's clock.
    tracingOptions: { metadata: { sessionId: s.id, elapsed: elapsed(vale, s.state), unlocked: s.state.unlocked.length } },
  });
  const parsed = GhostTurn.safeParse(extractJson(res.text ?? ""));
  if (!parsed.success) throw new Error("ghost returned no usable JSON");
  return checkCitations(parsed.data, new Set(s.state.unlocked));
}

let claimSeq = 0;
export function recordClaims(s: Session, claims: GhostTurn["claims"], origin: LedgerClaim["origin"], supersedes?: string) {
  const at = now();
  // A claim resting only on the ghost's own statement is a lie being restated.
  // It is already on the ledger as C-L1/C-L2, so it isn't written twice.
  const fresh = origin === "turn" ? claims.filter((c) => !(c.citations.length === 1 && c.citations[0] === "EV-002")) : claims;
  const made = fresh.map((c): LedgerClaim => ({
    id: `C-${String(++claimSeq).padStart(3, "0")}`, text: c.text, citations: c.citations as LedgerClaim["citations"], confidence: c.confidence,
    status: "standing", at, origin, ...(supersedes ? { supersedes } : {}),
  }));
  s.ledger.push(...made);
  return made;
}

export function scriptedLine(s: Session): string {
  const standing = standingLies(vale, s.state);
  return standing.length
    ? `${standing[0]!.claim} The archive is very quiet tonight.`
    : "The line is thin tonight. Ask me again in a moment.";
}

/** An investigator's question. Falls back to a scripted line, clearly labelled, if Gemma can't answer. */
export async function ghostTurn(s: Session, message: string) {
  s.transcript.push({ role: "investigator", text: message, at: now() });
  s.state = ask(s.state);
  try {
    const { turn, stripped } = await speak(s, message);
    const claims = recordClaims(s, turn.claims, "turn");
    s.transcript.push({ role: "ghost", text: turn.reply, at: now(), source: "model", claims: claims.map((c) => c.id) });
    if (stripped.length) {
      const what = stripped.length > 1 ? `${stripped.length} things` : "something";
      s.transcript.push({ role: "system", text: `The Caretaker said ${what} it could not back with a file you have found. It was struck from the record.`, at: now() });
    }
    // The tell is code's, not the model's: restating a lie always shows on the relic.
    const restated = turn.claims.some((c) => c.citations.length === 1 && c.citations[0] === "EV-002") && standingLies(vale, s.state).length > 0;
    s.face = restated ? "lying" : turn.face;
    return { ok: true as const, reply: turn.reply, claims, stripped, face: s.face, abstain: turn.abstain };
  } catch (e) {
    const text = scriptedLine(s);
    s.transcript.push({ role: "ghost", text, at: now(), source: "scripted" });
    s.transcript.push({ role: "system", text: `The ghost's model did not answer (${(e as Error).message}). That line was scripted.`, at: now() });
    return { ok: false as const, reply: text, claims: [], stripped: [], face: s.face, abstain: false };
  }
}
