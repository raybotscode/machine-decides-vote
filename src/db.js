const DAY_MS = 24 * 60 * 60 * 1000;

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
      ...(init.headers || {})
    }
  });
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

export function currentWeekWindow(now = new Date()) {
  const monday = startOfUtcWeek(now);
  const closesAt = new Date(monday.getTime() + 3 * DAY_MS - 60 * 1000);
  const { year, week } = isoWeek(monday);

  return {
    id: `${String(year).slice(-2)}-${String(week).padStart(2, "0")}`,
    opensAt: monday.toISOString(),
    closesAt: closesAt.toISOString(),
    isOpen: now >= monday && now <= closesAt
  };
}

export async function ensureCurrentWeek(db, now = new Date()) {
  const window = currentWeekWindow(now);
  let week = await getWeek(db, window.id);

  if (!week) {
    await db
      .prepare(
        "INSERT INTO weeks (id, status, opens_at, closes_at) VALUES (?, ?, ?, ?)"
      )
      .bind(window.id, window.isOpen ? "voting" : "closed", window.opensAt, window.closesAt)
      .run();
    week = await getWeek(db, window.id);
  }

  if (week.status !== "closed" && !window.isOpen) {
    week = await closeWeek(db, window.id);
  }

  if (week.status === "closed" && !week.winner_id) {
    week = await closeWeek(db, window.id);
  }

  return week;
}

export async function getWeek(db, weekId) {
  return db.prepare("SELECT * FROM weeks WHERE id = ?").bind(weekId).first();
}

export async function listDesigns(db, weekId) {
  const { results } = await db
    .prepare(
      `SELECT
        d.id,
        d.week_id,
        d.title,
        d.description,
        d.image_url,
        d.created_at,
        COALESCE(COUNT(v.id), 0) AS votes
      FROM designs d
      LEFT JOIN votes v ON v.design_id = d.id
      WHERE d.week_id = ?
      GROUP BY d.id
      ORDER BY d.created_at ASC, d.id ASC`
    )
    .bind(weekId)
    .all();

  return results || [];
}

export async function getResults(db, weekId) {
  const week = await getWeek(db, weekId);
  const designs = await listDesigns(db, weekId);
  const totalVotes = designs.reduce((total, design) => total + Number(design.votes || 0), 0);
  const winner = designs.find((design) => design.id === week?.winner_id) || null;

  return { week, designs, winner, total_votes: totalVotes };
}

export async function recordVote(db, designId, ip) {
  const design = await db
    .prepare(
      `SELECT d.id, d.week_id, w.status, w.opens_at, w.closes_at
       FROM designs d
       JOIN weeks w ON w.id = d.week_id
       WHERE d.id = ?`
    )
    .bind(designId)
    .first();

  if (!design) {
    return { ok: false, status: 404, error: "Unknown design." };
  }

  const now = new Date();
  if (design.status !== "voting" || now < new Date(design.opens_at) || now > new Date(design.closes_at)) {
    return { ok: false, status: 409, error: "Voting is closed for this design." };
  }

  const recentVote = await db
    .prepare(
      `SELECT id
       FROM votes
       WHERE design_id = ? AND ip = ? AND voted_at >= datetime('now', '-24 hours')
       LIMIT 1`
    )
    .bind(designId, ip)
    .first();

  if (recentVote) {
    return { ok: false, status: 429, error: "This IP has already voted for this design in the last 24 hours." };
  }

  await db.prepare("INSERT INTO votes (design_id, ip) VALUES (?, ?)").bind(designId, ip).run();
  return { ok: true, status: 201 };
}

export async function closeWeek(db, weekId) {
  const winner = await db
    .prepare(
      `SELECT d.id
       FROM designs d
       LEFT JOIN votes v ON v.design_id = d.id
       WHERE d.week_id = ?
       GROUP BY d.id
       ORDER BY COUNT(v.id) DESC, d.created_at ASC, d.id ASC
       LIMIT 1`
    )
    .bind(weekId)
    .first();

  await db
    .prepare("UPDATE weeks SET status = 'closed', winner_id = ? WHERE id = ?")
    .bind(winner?.id || null, weekId)
    .run();

  return getWeek(db, weekId);
}

export async function listArchive(db, currentWeekId) {
  const { results: winners } = await db
    .prepare(
      `SELECT
        w.id AS week_id,
        d.id,
        d.title,
        d.description,
        d.image_url,
        COALESCE(COUNT(v.id), 0) AS votes
      FROM weeks w
      JOIN designs d ON d.id = w.winner_id
      LEFT JOIN votes v ON v.design_id = d.id
      WHERE w.status = 'closed'
      GROUP BY w.id, d.id
      ORDER BY w.closes_at DESC
      LIMIT 12`
    )
    .all();

  const { results: nominees } = await db
    .prepare(
      `SELECT
        d.week_id,
        d.id,
        d.title,
        d.description,
        d.image_url,
        COALESCE(COUNT(v.id), 0) AS votes
      FROM designs d
      LEFT JOIN weeks w ON w.id = d.week_id
      LEFT JOIN votes v ON v.design_id = d.id
      WHERE d.week_id != ? AND (w.winner_id IS NULL OR d.id != w.winner_id)
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT 24`
    )
    .bind(currentWeekId)
    .all();

  return { winners: winners || [], nominees: nominees || [] };
}

function startOfUtcWeek(date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  return utc;
}

function isoWeek(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / DAY_MS + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}
