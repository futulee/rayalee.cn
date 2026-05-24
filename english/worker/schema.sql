CREATE TABLE IF NOT EXISTS progress (
  user_id     TEXT NOT NULL,
  word_id     TEXT NOT NULL,
  box         INTEGER NOT NULL DEFAULT 1,
  next_review TEXT NOT NULL,
  correct     INTEGER NOT NULL DEFAULT 0,
  wrong       INTEGER NOT NULL DEFAULT 0,
  learned_at  TEXT NOT NULL,
  last_seen   TEXT NOT NULL,
  PRIMARY KEY (user_id, word_id)
);

CREATE TABLE IF NOT EXISTS user_meta (
  user_id     TEXT PRIMARY KEY,
  nickname    TEXT NOT NULL,
  total_stars INTEGER NOT NULL DEFAULT 0,
  streak      INTEGER NOT NULL DEFAULT 0,
  last_active TEXT,
  created_at  TEXT NOT NULL
);
