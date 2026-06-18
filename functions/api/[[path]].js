// Machine Decides Voting API — Cloudflare Pages Function
// Handles voting data via D1 database.
// Routes: /api/current-week, /api/designs, /api/results, /api/vote, /api/archive

import { corsHeaders, currentWeekWindow, ensureCurrentWeek, getResults, json, listArchive, listDesigns, recordVote } from "./db.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (!env.DB) {
      return json({ error: "D1 binding DB is not configured." }, { status: 500 });
    }

    // API routes
    if (request.method === "GET" && url.pathname === "/api/current-week") {
      const week = await ensureCurrentWeek(env.DB);
      const designs = await listDesigns(env.DB, week.id);
      const results = await getResults(env.DB, week.id);
      return json({ ...week, designs, winner: results.winner });
    }

    if (request.method === "GET" && url.pathname === "/api/designs") {
      const week = await ensureCurrentWeek(env.DB);
      const designs = await listDesigns(env.DB, week.id);
      return json({ week_id: week.id, designs });
    }

    if (request.method === "GET" && url.pathname === "/api/results") {
      const weekId = url.searchParams.get("week") || currentWeekWindow().id;
      await ensureCurrentWeek(env.DB);
      return json(await getResults(env.DB, weekId));
    }

    if (request.method === "GET" && url.pathname === "/api/archive") {
      const week = await ensureCurrentWeek(env.DB);
      return json(await listArchive(env.DB, week.id));
    }

    if (request.method === "POST" && url.pathname === "/api/vote") {
      const body = await request.json().catch(() => ({}));
      const designId = body.design_id;
      if (!designId) {
        return json({ error: "Missing design_id" }, { status: 400 });
      }
      const clientIp = request.headers.get("CF-Connecting-IP") || "";
      const result = await recordVote(env.DB, designId, clientIp);
      return json(result);
    }

    return json({ error: "Not found" }, { status: 404 });

  } catch (err) {
    console.error("Vote API error:", err);
    return json({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
