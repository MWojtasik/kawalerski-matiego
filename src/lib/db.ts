import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Discipline, Match, Player, Stage, Team } from "./types";

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

export interface MatchRow {
	id: number;
	discipline_id: number;
	stage: Stage;
	group_no: number | null;
	round: number | null;
	player_a: number;
	player_b: number;
	winner_id: number | null;
}

export function toMatch(row: MatchRow): Match {
	return {
		id: row.id,
		disciplineId: row.discipline_id,
		stage: row.stage,
		groupNo: row.group_no,
		round: row.round,
		playerA: row.player_a,
		playerB: row.player_b,
		winnerId: row.winner_id,
	};
}

export async function loadPlayers(db: D1Database): Promise<Player[]> {
	const [{ results: players }, { results: signups }] = await Promise.all([
		db.prepare("SELECT id, name, emoji FROM players ORDER BY id").all<Omit<Player, "disciplineIds">>(),
		db
			.prepare("SELECT player_id, discipline_id FROM player_disciplines")
			.all<{ player_id: number; discipline_id: number }>(),
	]);
	const byPlayer = new Map<number, number[]>();
	for (const s of signups) {
		if (!byPlayer.has(s.player_id)) byPlayer.set(s.player_id, []);
		byPlayer.get(s.player_id)!.push(s.discipline_id);
	}
	return players.map((p) => ({ ...p, disciplineIds: byPlayer.get(p.id) ?? [] }));
}

export async function loadDisciplines(db: D1Database): Promise<Discipline[]> {
	const { results } = await db.prepare("SELECT * FROM disciplines ORDER BY id").all<Discipline>();
	return results;
}

export async function loadMatches(db: D1Database): Promise<Match[]> {
	const { results } = await db.prepare("SELECT * FROM matches ORDER BY id").all<MatchRow>();
	return results.map(toMatch);
}

interface TeamRow {
	id: number;
	discipline_id: number;
	player_a: number;
	player_b: number;
}

export async function loadTeams(db: D1Database): Promise<Team[]> {
	const { results } = await db.prepare("SELECT * FROM teams ORDER BY id").all<TeamRow>();
	return results.map((row) => ({
		id: row.id,
		disciplineId: row.discipline_id,
		playerA: row.player_a,
		playerB: row.player_b,
	}));
}

export async function insertTeam(
	db: D1Database,
	disciplineId: number,
	playerA: number,
	playerB: number,
): Promise<number> {
	const row = await db
		.prepare("INSERT INTO teams (discipline_id, player_a, player_b) VALUES (?, ?, ?) RETURNING id")
		.bind(disciplineId, playerA, playerB)
		.first<{ id: number }>();
	return row!.id;
}

/** Disciplines whose draw already happened (they have matches). */
export async function drawnDisciplineIds(db: D1Database): Promise<Set<number>> {
	const { results } = await db
		.prepare("SELECT DISTINCT discipline_id FROM matches")
		.all<{ discipline_id: number }>();
	return new Set(results.map((r) => r.discipline_id));
}

export async function insertMatch(
	db: D1Database,
	m: Omit<Match, "id" | "winnerId">,
): Promise<void> {
	await db
		.prepare(
			"INSERT INTO matches (discipline_id, stage, group_no, round, player_a, player_b) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(m.disciplineId, m.stage, m.groupNo, m.round, m.playerA, m.playerB)
		.run();
}
