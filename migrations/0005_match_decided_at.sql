-- Record when a match result was entered, for the live feed and recap ordering.
-- Additive + nullable: existing rows keep NULL, prod data untouched.
ALTER TABLE matches ADD COLUMN decided_at TEXT;
