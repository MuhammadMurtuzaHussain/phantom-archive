import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCitations } from "./citations.ts";

const unlocked = new Set(["EV-001", "EV-002"]);
const turn = (claims: any[]) => ({ reply: "", claims, abstain: false, face: "watching" as const });

test("keeps claims that cite unlocked evidence", () => {
  const r = checkCitations(turn([{ text: "a", citations: ["EV-001"], confidence: "high" }]), unlocked);
  assert.equal(r.turn.claims.length, 1);
});

test("strips claims citing locked or invented evidence", () => {
  const r = checkCitations(turn([{ text: "b", citations: ["EV-001", "EV-099"], confidence: "high" }]), unlocked);
  assert.equal(r.turn.claims.length, 0);
  assert.deepEqual(r.stripped[0]?.bad, ["EV-099"]);
});

test("uncited claims survive only as low-confidence speculation", () => {
  const r = checkCitations(
    turn([
      { text: "guess", citations: [], confidence: "low" },
      { text: "fact?", citations: [], confidence: "high" },
    ]),
    unlocked,
  );
  assert.deepEqual(r.turn.claims.map((c) => c.text), ["guess"]);
});
