-- Bilard switches to the piłkarzyki format: random 2v2 teams, knockout bracket.
-- The old group draw is wiped (organizer re-draws); player signups are kept.
UPDATE disciplines SET format = 'bracket2v2' WHERE slug = 'bilard';
DELETE FROM matches WHERE discipline_id = (SELECT id FROM disciplines WHERE slug = 'bilard');
DELETE FROM teams   WHERE discipline_id = (SELECT id FROM disciplines WHERE slug = 'bilard');
