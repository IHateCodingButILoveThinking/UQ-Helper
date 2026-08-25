ALTER TABLE food_shouts ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Food explorer'
  CHECK (length(display_name) BETWEEN 1 AND 24);

ALTER TABLE food_comments ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Food explorer'
  CHECK (length(display_name) BETWEEN 1 AND 24);

ALTER TABLE food_comments ADD COLUMN tone TEXT NOT NULL DEFAULT 'helpful'
  CHECK (tone IN ('loved_it', 'helpful', 'needs_update'));
