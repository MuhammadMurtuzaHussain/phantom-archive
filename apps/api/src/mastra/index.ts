import { Mastra } from "@mastra/core/mastra";
import { MastraPlatformExporter, Observability } from "@mastra/observability";
import { caretaker } from "../agent/caretaker.ts";
import { challengeWorkflow } from "../agent/challenge.ts";

// The Mastra instance, on its own so `mastra build` can find it. The game's
// Hono server (../server.ts) imports this same instance; Mastra Platform
// deploys it with Studio. Every ghost turn and challenge is traced to the
// Mastra dashboard when MASTRA_PLATFORM_ACCESS_TOKEN and MASTRA_PROJECT_ID are
// set. Without them the exporter does nothing.
export const mastra = new Mastra({
  // The platform's trace views are scoped to an environment, and traces with
  // none don't appear in them. The project's one environment is production.
  environment: process.env.MASTRA_ENVIRONMENT ?? "production",
  agents: { caretaker },
  workflows: { challengeWorkflow },
  observability: new Observability({
    configs: { default: { serviceName: "phantom-archive", exporters: [new MastraPlatformExporter()] } },
  }),
  bundler: { transpilePackages: ["@phantom/case-engine"] },
  logger: false,
});
