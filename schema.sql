PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS weeks (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'voting',
  winner_id TEXT,
  opens_at TEXT,
  closes_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (winner_id) REFERENCES designs(id)
);

CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (week_id) REFERENCES weeks(id)
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  design_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  voted_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (design_id) REFERENCES designs(id)
);

CREATE INDEX IF NOT EXISTS idx_votes_design ON votes(design_id);
CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip, design_id);
CREATE INDEX IF NOT EXISTS idx_designs_week ON designs(week_id);
