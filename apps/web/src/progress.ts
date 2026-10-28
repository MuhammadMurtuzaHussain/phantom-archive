import type { View } from "./api";

// The game opens up as you play. Each stage is derived from the session, so
// resuming a case shows exactly what you had, and the hints fire only once.
export type Stage = "files" | "claims" | "theory";

export function stages(v: View): Record<Stage, boolean> {
  const read = v.evidence.filter((e) => e.read).length;
  const asked = v.transcript.some((l) => l.role === "investigator");
  const broke = v.lies.some((l) => !l.standing);
  return {
    files: asked || read > 0,
    claims: v.evidence.some((e) => e.pinned) || read >= 5,
    theory: broke || read >= 12,
  };
}

export const relicAwake = (v: View) => stages(v).theory || v.relic.length > 0;

export function hint(stage: Stage, v: View): string[] {
  switch (stage) {
    case "files":
      return [`The Records Office recovered ${v.evidence.length} files from the archive.`, "Type files to look through them."];
    case "claims":
      return ["Everything the Caretaker says is now on the record.", "When a file contradicts it, challenge it. Type claims."];
    case "theory":
      return ["A claim broke, and something on Node 7 woke up with it.", "When you know what happened, type theory."];
  }
}

export const HELP: Record<Stage | "start", string[]> = {
  start: ["anything else      ask the Caretaker"],
  files: ["files              list recovered files", "open EV-004        read a file"],
  claims: ["pin EV-004         keep a file as evidence", "claims             the Caretaker's claims", "challenge L1 EV-005  confront a claim", "scan               look for anomalies in the telemetry"],
  theory: ["theory             name what happened, and decide", "touch / breathe    the relic"],
};

export type Command =
  | { kind: "help" }
  | { kind: "panel"; panel: "files" | "claims" | "theory" }
  | { kind: "open"; id: string }
  | { kind: "pin"; id: string }
  | { kind: "challenge"; lie: string; cited: string[] }
  | { kind: "scan" }
  | { kind: "relic"; type: "touch" | "warmth" }
  | { kind: "ask"; text: string };

const ids = (s: string) => [...s.toUpperCase().matchAll(/EV-(?:R-)?\d{3}/g)].map((m) => m[0]);

export function parse(input: string): Command {
  const t = input.trim();
  const l = t.toLowerCase();
  if (l === "help" || l === "?") return { kind: "help" };
  if (l === "files" || l === "ls" || l === "dir") return { kind: "panel", panel: "files" };
  if (l === "claims" || l === "ledger") return { kind: "panel", panel: "claims" };
  if (l === "theory" || l === "board") return { kind: "panel", panel: "theory" };
  if (l === "scan") return { kind: "scan" };
  if (l === "touch" || l === "touch relic") return { kind: "relic", type: "touch" };
  if (l === "breathe" || l === "breathe on relic") return { kind: "relic", type: "warmth" };
  let m = l.match(/^(?:open|read|cat)\s+(.+)$/);
  if (m && ids(m[1]!).length) return { kind: "open", id: ids(m[1]!)[0]! };
  m = l.match(/^pin\s+(.+)$/);
  if (m && ids(m[1]!).length) return { kind: "pin", id: ids(m[1]!)[0]! };
  m = l.match(/^challenge\s+(l\d)\b(.*)$/);
  if (m) return { kind: "challenge", lie: m[1]!.toUpperCase(), cited: ids(m[2]!) };
  return { kind: "ask", text: t };
}
