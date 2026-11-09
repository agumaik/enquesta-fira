CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  collectiu TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_email ON responses (email);
