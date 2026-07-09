import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Discipline, Match, Player, Stage } from "./types";

interface Env {
	DB: D1Database;
	ADMIN_PIN?: string;
}

export async function getEnv(): Promise<Env> {
	const { env } = await getCloudflareContext({ async: true });
	return env as unknown as Env;
}

export async function getDb(): Promise<D1Database> {
	return (await getEnv()).DB;
}

interface MatchRow {
	id: number;
	discipline_id: number;
	stage: Stage;
	group_no: number | null;
	round: number | null;
	player_a: number;
	player_b: number;
	score_a: number | null;
	score_b: number | null;
	winner_id: number | null;
}

function toMatch(row: MatchRow): Match {
	return {
		id: row.id,
		disciplineId: row.discipline_id,
		stage: row.stage,
		groupNo: row.group_no,
		round: row.round,
		playerA: row.player_a,
		playerB: row.player_b,
		scoreA: row.score_a,
		scoreB: row.score_b,
		winnerId: row.winner_id,
	};
}

export async function loadPlayers(db: D1Database): Promise<Player[]> {
	const { results } = await db.prepare("SELECT * FROM players ORDER BY id").all<Player>();
	return results;
}

export async function loadDisciplines(db: D1Database): Promise<Discipline[]> {
	const { results } = await db.prepare("SELECT * FROM disciplines ORDER BY id").all<Discipline>();
	return results;
}

export async function loadMatches(db: D1Database): Promise<Match[]> {
	const { results } = await db.prepare("SELECT * FROM matches ORDER BY id").all<MatchRow>();
	return results.map(toMatch);
}

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
	const row = await db
		.prepare("SELECT value FROM settings WHERE key = ?")
		.bind(key)
		.first<{ value: string }>();
	return row?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
	await db
		.prepare(
			"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		)
		.bind(key, value)
		.run();
}

export async function insertMatch(
	db: D1Database,
	m: Omit<Match, "id" | "scoreA" | "scoreB" | "winnerId">,
): Promise<void> {
	await db
		.prepare(
			"INSERT INTO matches (discipline_id, stage, group_no, round, player_a, player_b) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(m.disciplineId, m.stage, m.groupNo, m.round, m.playerA, m.playerB)
		.run();
}
