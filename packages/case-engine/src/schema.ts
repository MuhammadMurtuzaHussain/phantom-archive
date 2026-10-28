import { z } from "zod";

// The three sources of truth. The UI colours them differently and the ghost
// is told which is which, so it can never pass off its own guess as a log line.
export const Layer = z.enum(["physical", "digital", "interpretation"]);
export type Layer = z.infer<typeof Layer>;

export const EvidenceId = z.string().regex(/^EV-(R-)?\d{3}$/);

export const Evidence = z.object({
  id: EvidenceId,
  title: z.string(),
  layer: Layer,
  kind: z.enum(["log", "message", "file", "page", "telemetry", "relic", "photo"]),
  source: z.string(),
  ts: z.string().datetime(),
  body: z.string(),
  // Evidence starts hidden; an unlock rule in the case decides when the player sees it.
  unlockedBy: z.string().default("start"),
  tags: z.array(z.string()).default([]),
});
export type Evidence = z.infer<typeof Evidence>;

export const Claim = z.object({
  id: z.string(),
  text: z.string(),
  citations: z.array(EvidenceId),
  confidence: z.enum(["low", "medium", "high"]),
  status: z.enum(["standing", "revised", "upheld", "abstained", "stripped"]),
  supersedes: z.string().optional(),
  at: z.string().datetime(),
});
export type Claim = z.infer<typeof Claim>;

// What Gemma must return on every turn. Code validates it before anyone sees it.
export const GhostTurn = z.object({
  reply: z.string(),
  claims: z
    .array(
      z.object({
        text: z.string(),
        citations: z.array(z.string()),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .default([]),
  abstain: z.boolean().default(false),
  face: z.enum(["calm", "watching", "lying", "grief", "gone"]).default("watching"),
});
export type GhostTurn = z.infer<typeof GhostTurn>;

export const RelicEvent = z.object({
  type: z.enum(["boot", "touch", "warmth", "cold", "heartbeat"]),
  ts: z.string().datetime(),
  seq: z.number().int().nonnegative(),
  value: z.number().optional(),
});
export type RelicEvent = z.infer<typeof RelicEvent>;
