// Node-only: reads a case folder from disk. The web app never imports this.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Evidence } from "./schema.ts";
import type { CaseDef } from "./engine.ts";

/** Evidence files are markdown with a flat `key: value` frontmatter block. */
export function parseEvidence(text: string) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("evidence file has no frontmatter");
  const meta: Record<string, unknown> = {};
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(": ");
    if (i > 0) meta[line.slice(0, i)] = line.slice(i + 2);
  }
  meta.tags = String(meta.tags ?? "").split(",").filter(Boolean);
  return Evidence.parse({ ...meta, body: m[2]!.trimEnd() });
}

export function loadCase(dir: string): CaseDef {
  const def = JSON.parse(readFileSync(join(dir, "case.json"), "utf8"));
  const evDir = join(dir, "evidence");
  const evidence = readdirSync(evDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseEvidence(readFileSync(join(evDir, f), "utf8")));
  return { ...def, evidence };
}
