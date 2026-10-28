import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ghostModel } from "./agent/model.ts";

const app = new Hono();

app.get("/api/health", (c) => {
  const { modelId, baseURL } = ghostModel();
  return c.json({ ok: true, ghost: { model: modelId, home: new URL(baseURL).host } });
});

const port = Number(process.env.PORT ?? 3030);
serve({ fetch: app.fetch, port }, () => console.log(`archive api on :${port}`));
