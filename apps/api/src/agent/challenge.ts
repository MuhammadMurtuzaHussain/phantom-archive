import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import * as E from "@phantom/case-engine";
import { getSession, vale } from "../game/store.ts";
import { recordClaims, speak } from "../game/ghost.ts";

// Challenging the ghost, as a Mastra workflow:
//   judge (code) → speak (Gemma) → record (ledger)
// Code alone decides whether the challenge lands. Gemma only finds the words,
// and if it can't, the concession written in the case is used verbatim.

const input = z.object({ sessionId: z.string(), lieId: z.string(), cited: z.array(z.string()) });
const judged = input.extend({ landed: z.boolean(), reason: z.string(), breaker: z.string().optional() });
const spoken = judged.extend({ reply: z.string(), claims: z.array(z.any()), face: z.string(), source: z.enum(["model", "scripted"]) });
const out = spoken.extend({ ledgerIds: z.array(z.string()) });

const now = () => new Date().toISOString();
const must = (id: string) => {
  const s = getSession(id);
  if (!s) throw new Error(`no session ${id}`);
  return s;
};

const judge = createStep({
  id: "judge",
  description: "Does the cited evidence break the lie? Decided by the case engine, not the model",
  inputSchema: input,
  outputSchema: judged,
  execute: async ({ inputData }) => {
    const s = must(inputData.sessionId);
    const r = E.challenge(vale, s.state, inputData.lieId, inputData.cited);
    s.state = r.state;
    return r.ok ? { ...inputData, landed: true, reason: "broken", breaker: r.breaker } : { ...inputData, landed: false, reason: r.reason };
  },
});

const speakStep = createStep({
  id: "speak",
  description: "The Caretaker concedes, or holds its ground, in its own words",
  inputSchema: judged,
  outputSchema: spoken,
  execute: async ({ inputData }) => {
    const s = must(inputData.sessionId);
    const lie = vale.lies.find((l) => l.id === inputData.lieId)!;
    const titles = inputData.cited.map((id) => `${id} "${vale.evidence.find((e) => e.id === id)?.title ?? "?"}"`).join(", ");
    const prompt = inputData.landed
      ? `The investigator confronts you with ${titles}. It breaks your claim "${lie.claim}". You cannot keep it. Concede now, in character, in under 70 words: ${lie.concession} Read ${inputData.breaker} with your tool and cite it. face "grief".`
      : `The investigator challenges your claim "${lie.claim}" with ${titles || "no evidence"}. Nothing they cited contradicts it. Hold your ground calmly in under 50 words and cite EV-002. face "lying".`;
    try {
      const { turn } = await speak(s, prompt, false);
      return { ...inputData, reply: turn.reply, claims: turn.claims, face: turn.face, source: "model" as const };
    } catch {
      const reply = inputData.landed ? lie.concession.replace(/\byou\b/gi, "I").replace(/\byour\b/gi, "my") : `${lie.claim} Nothing you have shown me says otherwise.`;
      const claims = inputData.landed ? [{ text: reply, citations: [inputData.breaker!], confidence: "high" as const }] : [];
      return { ...inputData, reply, claims, face: inputData.landed ? "grief" : "lying", source: "scripted" as const };
    }
  },
});

const record = createStep({
  id: "record",
  description: "Strike the old claim, keep it visible, and write the new one beside it",
  inputSchema: spoken,
  outputSchema: out,
  execute: async ({ inputData }) => {
    const s = must(inputData.sessionId);
    const old = s.ledger.find((c) => c.id === `C-${inputData.lieId}`);
    s.transcript.push({ role: "investigator", text: `You confront the Caretaker with ${inputData.cited.join(", ") || "nothing"}.`, at: now() });
    s.face = inputData.face as Session["face"];
    if (inputData.landed && old) old.status = "revised";
    const made = recordClaims(s, inputData.claims, "challenge", old?.id);
    if (!inputData.landed) made.forEach((c) => (c.status = "upheld"));
    s.transcript.push({ role: "ghost", text: inputData.reply, at: now(), source: inputData.source, claims: made.map((c) => c.id) });
    return { ...inputData, ledgerIds: made.map((c) => c.id) };
  },
});

type Session = NonNullable<ReturnType<typeof getSession>>;

export const challengeWorkflow = createWorkflow({ id: "challenge", inputSchema: input, outputSchema: out })
  .then(judge)
  .then(speakStep)
  .then(record)
  .commit();
