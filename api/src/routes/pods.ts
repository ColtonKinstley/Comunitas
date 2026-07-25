import { Hono } from "hono";
import { db } from "../db";
import { pods } from "../db/schema";
import { fail, requireUuid } from "../lib/http";
import { loadPodDetail } from "../lib/queries";
import type { PodDetail, PodSummary } from "../types";
import { toPodSummary } from "../lib/queries";

export const podsRoutes = new Hono();

/** Handy for demos and the pod-reveal moment; not in the spec's core surface. */
podsRoutes.get("/", async (c) => {
  const rows = await db.select().from(pods).orderBy(pods.name);
  return c.json<PodSummary[]>(rows.map((p) => toPodSummary(p)));
});

podsRoutes.get("/:id", async (c) => {
  const id = requireUuid(c.req.param("id"), "pod id");
  const pod = await loadPodDetail(id);
  if (!pod) fail(404, "pod not found");
  return c.json<PodDetail>(pod);
});
