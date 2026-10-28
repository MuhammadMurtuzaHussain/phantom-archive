import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadCase } from "./load.ts";
import * as E from "./engine.ts";

const vale = loadCase(fileURLToPath(new URL("../../../content/cases/vale", import.meta.url)));

/** Read everything currently unlocked until nothing new opens. */
function readAll(s: E.SessionState) {
  for (;;) {
    const unread = s.unlocked.filter((id) => !s.read.includes(id));
    if (!unread.length) return s;
    for (const id of unread) s = E.readEvidence(vale, s, id);
  }
}

test("the case loads: 24 evidence items, unique ids, every unlock rule names real things", () => {
  assert.equal(vale.evidence.length, 24);
  const ids = new Set(vale.evidence.map((e) => e.id));
  assert.equal(ids.size, 24);
  for (const l of vale.lies) for (const b of l.brokenBy) assert.ok(ids.has(b), `${l.id} breaker ${b}`);
  for (const q of vale.questions) for (const p of q.proof) assert.ok(ids.has(p), `${q.id} proof ${p}`);
});

test("a new session starts with the brief, the lie and the report, and nothing else", () => {
  assert.deepEqual(E.newSession(vale).unlocked, ["EV-001", "EV-002", "EV-003", "EV-004"]);
});

test("reading alone cannot reach the truth: the proof sits behind the lies", () => {
  const s = readAll(E.newSession(vale));
  for (const id of ["EV-016", "EV-017", "EV-020", "EV-021", "EV-023"]) assert.ok(!s.unlocked.includes(id), id);
  assert.equal(E.scoreTheory(vale, s).proven, false);
});

test("a challenge without a breaker holds; with one it lands", () => {
  let s = readAll(E.newSession(vale));
  assert.equal(E.challenge(vale, s, "L1", ["EV-001"]).ok, false);
  const r = E.challenge(vale, s, "L1", ["EV-005"]);
  assert.ok(r.ok);
  assert.ok(r.state.unlocked.includes("EV-015"));
  // Locked evidence can't break a lie, even if it's on the list.
  assert.equal(E.challenge(vale, E.newSession(vale), "L1", ["EV-005"]).ok, false);
});

test("full playthrough: scan, relic, both lies, proof, and Carry her home", () => {
  let s = readAll(E.newSession(vale));
  s = readAll(E.markRelic(vale, E.markScanned(vale, s)));
  assert.ok(s.unlocked.includes("EV-R-001") && s.unlocked.includes("EV-014"));
  s = (E.challenge(vale, s, "L1", ["EV-R-001"]) as { state: E.SessionState }).state;
  s = (E.challenge(vale, s, "L2", ["EV-014"]) as { state: E.SessionState }).state;
  s = readAll(s);
  assert.equal(E.standingLies(vale, s).length, 0);
  assert.equal(s.unlocked.length, 24, "every evidence item is reachable");
  assert.equal(E.chooseEnding(vale, s, "carry").ok, false, "carry stays shut without a proven theory");
  for (const [q, a] of [["who", "ines"], ["what", "archived"], ["where", "hospice"]] as const) s = E.answer(s, q, a);
  assert.deepEqual(E.scoreTheory(vale, s).verdicts, { who: "hunch", what: "hunch", where: "hunch" });
  for (const id of ["EV-006", "EV-017", "EV-021"]) s = E.togglePin(s, id);
  assert.equal(E.scoreTheory(vale, s).proven, true);
  const end = E.chooseEnding(vale, s, "carry");
  assert.ok(end.ok);
  assert.match(end.state.ending!.text, /ofrenda/);
});

test("blaming Pell gives the wrongful Expose", () => {
  let s = E.answer(readAll(E.newSession(vale)), "who", "pell");
  assert.equal(E.chooseEnding(vale, s, "expose").state.ending?.variant, "blames-pell");
});

test("the night is long enough to read every file and still ask plenty", () => {
  const { minutes, question, read } = vale.clock;
  const spare = minutes - vale.evidence.length * read;
  assert.ok(spare / question >= 25, `only ${Math.floor(spare / question)} questions fit`);
});

test("at midnight the clock closes the case, and no ending can be chosen after", () => {
  let s = readAll(E.newSession(vale));
  assert.equal(E.midnight(vale, s), s, "before midnight nothing happens");
  assert.ok(!E.availableEndings(vale, s).some((e) => e.id === "blackout"), "the player can't pick Midnight");
  assert.equal(E.chooseEnding(vale, s, "blackout").ok, false);
  while (!E.nightOver(vale, s)) s = E.ask(s);
  assert.equal(E.elapsed(vale, s), vale.clock.minutes);
  assert.equal(E.chooseEnding(vale, s, "preserve").ok, false, "too late to choose");
  s = E.midnight(vale, s);
  assert.equal(s.ending?.id, "blackout");
  assert.equal(s.ending?.title, "Midnight");
  assert.equal(s.ending?.variant, "default");
  assert.equal(E.midnight(vale, s), s, "it only happens once");
});

test("running out of night with the truth pinned gives the bitter Midnight", () => {
  let s = readAll(E.markRelic(vale, E.markScanned(vale, readAll(E.newSession(vale)))));
  s = (E.challenge(vale, s, "L1", ["EV-R-001"]) as { state: E.SessionState }).state;
  s = readAll((E.challenge(vale, s, "L2", ["EV-014"]) as { state: E.SessionState }).state);
  for (const [q, a] of [["who", "ines"], ["what", "archived"], ["where", "hospice"]] as const) s = E.answer(s, q, a);
  for (const id of ["EV-006", "EV-017", "EV-021"]) s = E.togglePin(s, id);
  while (!E.nightOver(vale, s)) s = E.ask(s);
  assert.equal(E.midnight(vale, s).ending?.variant, "true");
});
