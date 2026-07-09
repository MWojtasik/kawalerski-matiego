-- Players opt into disciplines at signup
CREATE TABLE player_disciplines (
    player_id INTEGER NOT NULL REFERENCES players(id),
    discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
    PRIMARY KEY (player_id, discipline_id)
);
