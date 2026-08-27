CREATE TABLE IF NOT EXISTS food_engagement_rewards (
  author_hash TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('first_comment', 'first_rating')),
  xp INTEGER NOT NULL CHECK (xp = 50),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (author_hash, reward_type)
);

CREATE INDEX IF NOT EXISTS idx_food_engagement_rewards_author
  ON food_engagement_rewards (author_hash, created_at DESC);

