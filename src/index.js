import {
  corsHeaders,
  currentWeekWindow,
  ensureCurrentWeek,
  getResults,
  json,
  listArchive,
  listDesigns,
  recordVote
} from "./db.js";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    try {
      if (!env.DB) {
        return json({ error: "D1 binding DB is not configured." }, { status: 500 });
      }

      if (request.method === "GET" && url.pathname === "/widget.js") {
        return env.ASSETS.fetch(request);
      }

      if (request.method === "GET" && url.pathname === "/vote") {
        return votePage(url.origin);
      }

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
        const body = await readJSON(request);
        const designId = body.design_id;

        if (!designId || typeof designId !== "string") {
          return json({ error: "design_id is required." }, { status: 400 });
        }

        await ensureCurrentWeek(env.DB);
        const ip = getClientIP(request);
        const result = await recordVote(env.DB, designId, ip);

        if (!result.ok) {
          return json({ error: result.error }, { status: result.status });
        }

        return json({ ok: true }, { status: result.status });
      }

      return json({ error: "Not found." }, { status: 404 });
    } catch (error) {
      return json({ error: error.message || "Internal server error." }, { status: 500 });
    }
  }
};

async function readJSON(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  return request.json();
}

function getClientIP(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

function votePage(origin) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Machine Decides Vote</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        background: #0a0a0a;
        padding: 24px;
      }
    </style>
  </head>
  <body>
    <div id="machine-decides-vote"></div>
    <script src="${origin}/widget.js" data-api-base="${origin}" defer></script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
