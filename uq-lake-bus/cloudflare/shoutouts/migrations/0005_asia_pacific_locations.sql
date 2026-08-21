CREATE TABLE shout_locations_asia_pacific (
  id TEXT PRIMARY KEY,
  latitude_e6 INTEGER NOT NULL CHECK (latitude_e6 BETWEEN -45000000 AND 82000000),
  longitude_e6 INTEGER NOT NULL CHECK (longitude_e6 BETWEEN 25000000 AND 180000000),
  label TEXT NOT NULL DEFAULT '' CHECK (length(label) <= 60),
  kind TEXT NOT NULL CHECK (kind IN ('preset', 'pin')),
  created_at INTEGER NOT NULL
);

INSERT INTO shout_locations_asia_pacific
  (id, latitude_e6, longitude_e6, label, kind, created_at)
SELECT id, latitude_e6, longitude_e6, label, kind, created_at
FROM shout_locations;

DROP TABLE shout_locations;
ALTER TABLE shout_locations_asia_pacific RENAME TO shout_locations;

CREATE INDEX idx_shout_locations_bounds
  ON shout_locations (latitude_e6, longitude_e6);
