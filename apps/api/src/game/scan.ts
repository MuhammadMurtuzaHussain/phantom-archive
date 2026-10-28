import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Demo-safe anomaly scan: a z-score against the hours the archive itself
// labelled normal. Phase 3 puts TabPFN (and IsolationForest) in front of this
// on DigitalOcean; this stays as the baseline and the offline fallback.

const FEATURES = ["door_badge", "door_manual", "door_denied", "rack7_kw", "archive_io_gb", "net_out_mb", "node_temp_c"] as const;
type Row = Record<string, string>;

function readRows(): Row[] {
  const [head, ...lines] = readFileSync(fileURLToPath(new URL("../../../../content/cases/vale/telemetry.csv", import.meta.url)), "utf8").trim().split("\n");
  const cols = head!.split(",");
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i]!, v])));
}

export type ScanHit = { ts: string; score: number; drivers: string[] };

export function zScan(threshold = 6): { method: string; hits: ScanHit[] } {
  const rows = readRows();
  const normal = rows.filter((r) => r.label === "normal");
  const stats = Object.fromEntries(
    FEATURES.map((f) => {
      // Compare like with like: night hours against night hours.
      const byHour = (h: number) => normal.filter((r) => Number(r.hour) === h).map((r) => Number(r[f]));
      return [f, (h: number) => {
        const xs = byHour(h);
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) || 0.05;
        return { mean, sd };
      }];
    }),
  ) as Record<(typeof FEATURES)[number], (h: number) => { mean: number; sd: number }>;

  const hits = rows
    .filter((r) => r.label === "")
    .map((r) => {
      const zs = FEATURES.map((f) => {
        const { mean, sd } = stats[f](Number(r.hour));
        return [f, Math.abs(Number(r[f]) - mean) / sd] as const;
      });
      const score = Math.max(...zs.map(([, z]) => z));
      return { ts: r.ts!, score: Math.round(score * 10) / 10, drivers: zs.filter(([, z]) => z >= threshold).map(([f]) => f) };
    })
    .filter((h) => h.score >= threshold);
  return { method: `z-score per hour of day, |z| ≥ ${threshold}, against ${normal.length} hours labelled normal`, hits };
}

export function scanReport(): string {
  const { method, hits } = zScan();
  const nights = new Map<string, ScanHit[]>();
  for (const h of hits) nights.set(h.ts.slice(0, 10), [...(nights.get(h.ts.slice(0, 10)) ?? []), h]);
  const lines = [...nights].map(([d, hs]) => `${d}  ${hs.map((h) => h.ts.slice(11, 16)).join(" ")}  (${[...new Set(hs.flatMap((h) => h.drivers))].join(", ")})`);
  return [
    "ORACLE · fallback scan (Phase 3 brings TabPFN)",
    `method: ${method}`,
    `unlabelled hours scanned: 264 · flagged: ${hits.length}`,
    "",
    "night       flagged hours   (what moved)",
    ...lines,
  ].join("\n");
}
