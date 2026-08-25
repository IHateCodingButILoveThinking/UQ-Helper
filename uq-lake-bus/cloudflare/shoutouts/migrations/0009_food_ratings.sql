CREATE TABLE IF NOT EXISTS food_ratings (
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  client_hash TEXT NOT NULL,
  rating_x2 INTEGER NOT NULL CHECK (rating_x2 BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (shout_id, client_hash)
);

CREATE INDEX IF NOT EXISTS idx_food_ratings_shout
  ON food_ratings (shout_id, updated_at DESC);
