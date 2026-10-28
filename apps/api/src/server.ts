import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { Mastra } from "@mastra/core";
import { z } from "zod";
import * as E from "@phantom/case-engine";
import { ghostModel } from "./agent/model.ts";
import { challengeWorkflow } from "./agent/challenge.ts";
import { createSession, evidenceFor, getSession, vale, view, type Session } from "./game/store.ts";
import { ghostTurn } from "./game/ghost.ts";
import { scanReport } from "./game/scan.ts";

export const mastra = new Mastra({ workflows: { challengeWorkflow }, logger: false });

const app = new Hono();
const api = new Hono<{ Variables: { s: Session } }>();

app.get("/api/health", (c) => {
  const { modelId, baseURL } = ghostModel();
  return c.json({ ok: true, ghost: { model: modelId, home: new URL(baseURL).host } });
});

app.post("/api/session", (c) => c.json(view(createSession())));

api.use("/:id/*", async (c, next) => {
  const s = getSession(c.req.param("id"));
  if (!s) return c.json({ error: "no such session" }, 404);
  c.set("s", s);
  await next();
});
api.get("/:id/state", (c) => c.json(view(c.get("s"))));

api.get("/:id/evidence/:eid", (c) => {
  const s = c.get("s");
  const e = evidenceFor(s, c.req.param("eid"));
  if (!e) return c.json({ error: "not found" }, 404);
  s.state = E.readEvidence(vale, s.state, e.id);
  return c.json({ evidence: { ...e, unlockedBy: undefined }, state: view(s) });
});

api.post("/:id/pin/:eid", (c) => {
  const s = c.get("s");
  s.state = E.togglePin(s.state, c.req.param("eid"));
  return c.json(view(s));
});

api.post("/:id/scan", (c) => {
  const s = c.get("s");
  s.overrides["EV-012"] = scanReport();
  s.state = E.markScanned(vale, s.state);
  return c.json(view(s));
});

const RelicIn = z.object({ type: z.enum(["boot", "touch", "warmth", "cold", "heartbeat"]), value: z.number().optional() });
api.post("/:id/relic", async (c) => {
  const s = c.get("s");
  const ev = RelicIn.safeParse(await c.req.json().catch(() => null));
  if (!ev.success) return c.json({ error: "bad relic event" }, 400);
  s.relic.push({ ...ev.data, at: new Date().toISOString() });
  s.state = E.markRelic(vale, s.state);
  return c.json(view(s));
});

api.post("/:id/turn", async (c) => {
  const s = c.get("s");
  const body = z.object({ message: z.string().trim().min(1).max(500) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "say something" }, 400);
  const turn = await ghostTurn(s, body.data.message);
  return c.json({ turn, state: view(s) });
});

api.post("/:id/challenge", async (c) => {
  const s = c.get("s");
  const body = z.object({ lieId: z.string(), cited: z.array(z.string()).max(6) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "bad challenge" }, 400);
  const run = await mastra.getWorkflow("challengeWorkflow").createRun();
  const res = await run.start({ inputData: { sessionId: s.id, ...body.data } });
  if (res.status !== "success") return c.json({ error: "challenge failed", status: res.status }, 500);
  return c.json({ result: { landed: res.result.landed, reason: res.result.reason }, state: view(s) });
});

api.post("/:id/answer", async (c) => {
  const s = c.get("s");
  const body = z.object({ question: z.string(), answer: z.string() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "bad answer" }, 400);
  s.state = E.answer(s.state, body.data.question, body.data.answer);
  return c.json(view(s));
});

api.post("/:id/ending/:eid", (c) => {
  const s = c.get("s");
  const r = E.chooseEnding(vale, s.state, c.req.param("eid"));
  s.state = r.state;
  return c.json({ ok: r.ok, state: view(s) }, r.ok ? 200 : 409);
});

app.route("/api/session", api);

// In production the API also serves the built game.
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "../web/dist" }));
  app.get("*", serveStatic({ path: "../web/dist/index.html" }));
}

const port = Number(process.env.PORT ?? 3030);
serve({ fetch: app.fetch, port }, () => console.log(`archive api on :${port}`));
