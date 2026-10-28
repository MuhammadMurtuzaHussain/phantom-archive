import type { GhostTurn } from "./schema.ts";

export type CitationCheck = {
  turn: GhostTurn;
  stripped: { text: string; bad: string[] }[];
};

/**
 * The ghost may only cite evidence that exists and that the player has unlocked.
 * A claim with any bad citation is removed, not repaired: we never guess what it meant.
 * A claim with no citations at all is allowed only at low confidence (speculation).
 */
export function checkCitations(turn: GhostTurn, unlocked: ReadonlySet<string>): CitationCheck {
  const stripped: CitationCheck["stripped"] = [];
  const claims = turn.claims.filter((c) => {
    const bad = c.citations.filter((id) => !unlocked.has(id));
    const unsupported = c.citations.length === 0 && c.confidence !== "low";
    if (bad.length || unsupported) {
      stripped.push({ text: c.text, bad: unsupported ? ["<none>"] : bad });
      return false;
    }
    return true;
  });
  return { turn: { ...turn, claims }, stripped };
}
