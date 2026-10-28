// Packs a case folder (case.json + evidence/*.md) into one JSON file, so a
// bundled build (mastra build) carries the case with it instead of reading
// the folder at runtime. case.test.ts fails if the bundle drifts from the files.
//
//   pnpm --filter @phantom/case-engine bundle
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCase } from "./load.ts";

const dir = process.argv[2];
if (!dir) throw new Error("usage: bundle.ts <case folder>");
writeFileSync(join(dir, "case.bundle.json"), `${JSON.stringify(loadCase(dir), null, 1)}\n`);
