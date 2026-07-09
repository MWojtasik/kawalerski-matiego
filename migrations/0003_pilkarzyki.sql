-- Piłkarzyki: 2v2 bracket discipline, random teams, straight knockout.
PRAGMA defer_foreign_keys = true;

ALTER TABLE disciplines ADD COLUMN format TEXT NOT NULL DEFAULT 'groups';

INSERT INTO disciplines (slug, name, icon, format) VALUES
    ('pilkarzyki', 'Piłkarzyki', '⚽', 'bracket2v2');

CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
    player_a INTEGER NOT NULL REFERENCES players(id),
    player_b INTEGER NOT NULL REFERENCES players(id)
);

-- Rebuild matches: stage gains 'quarter', and player_a/player_b/winner_id lose
-- their FKs to players — for bracket disciplines they hold TEAM ids.
DROP TABLE matches;
CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
    stage TEXT NOT NULL CHECK (stage IN ('group', 'quarter', 'semi', 'third', 'final')),
    group_no INTEGER,
    round INTEGER,
    player_a INTEGER NOT NULL,
    player_b INTEGER NOT NULL,
    score_a INTEGER,
    score_b INTEGER,
    winner_id INTEGER
);
