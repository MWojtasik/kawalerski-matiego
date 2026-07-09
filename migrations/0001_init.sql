-- Tournament schema
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🍺'
);

CREATE TABLE disciplines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL
);

CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
    stage TEXT NOT NULL CHECK (stage IN ('group', 'semi', 'third', 'final')),
    group_no INTEGER,
    round INTEGER,
    player_a INTEGER NOT NULL REFERENCES players(id),
    player_b INTEGER NOT NULL REFERENCES players(id),
    score_a INTEGER,
    score_b INTEGER,
    winner_id INTEGER REFERENCES players(id)
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO disciplines (slug, name, icon) VALUES
    ('bilard', 'Bilard', '🎱'),
    ('dart', 'Dart', '🎯'),
    ('pingpong', 'Ping-pong', '🏓');
