import { NextResponse } from "next/server";
import { getDb, insertMatch } from "@/lib/db";
import { groupsOf } from "@/lib/state";
import { seedSemis, stageComplete } from "@/lib/tournament";
import type { Match, Stage } from "@/lib/types";

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

async function disciplineMatches(db: D1Database, disciplineId: number): Promise<Match[]> {
	const { results } = await db
		.prepare("SELECT * FROM matches WHERE discipline_id = ? ORDER BY id")
		.bind(disciplineId)
		.all<MatchRow>();
	return results.map((r) => ({
		id: r.id,
		disciplineId: r.discipline_id,
		stage: r.stage,
		groupNo: r.group_no,
		round: r.round,
		playerA: r.player_a,
		playerB: r.player_b,
		scoreA: r.score_a,
		scoreB: r.score_b,
		winnerId: r.winner_id,
	}));
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const db = await getDb();
	const { id } = await params;
	const match = await db
		.prepare("SELECT * FROM matches WHERE id = ?")
		.bind(Number(id))
		.first<MatchRow>();
	if (!match) {
		return NextResponse.json({ error: "Nie ma takiego meczu" }, { status: 404 });
	}

	const body = (await request.json()) as { scoreA?: number; scoreB?: number };
	const scoreA = Number(body.scoreA);
	const scoreB = Number(body.scoreB);
	if (
		!Number.isInteger(scoreA) ||
		!Number.isInteger(scoreB) ||
		scoreA < 0 ||
		scoreB < 0 ||
		scoreA === scoreB
	) {
		return NextResponse.json(
			{ error: "Wynik musi być dwiema różnymi liczbami — ktoś musi wygrać" },
			{ status: 400 },
		);
	}

	const all = await disciplineMatches(db, match.discipline_id);
	if (match.stage === "group" && all.some((m) => m.stage !== "group")) {
		return NextResponse.json(
			{ error: "Playoff już wystartował — wyniki grupy zamrożone (użyj resetu, jeśli trzeba)" },
			{ status: 409 },
		);
	}
	if (match.stage === "semi" && all.some((m) => m.stage === "final")) {
		return NextResponse.json(
			{ error: "Finał już utworzony — wynik półfinału zamrożony" },
			{ status: 409 },
		);
	}

	const winnerId = scoreA > scoreB ? match.player_a : match.player_b;
	await db
		.prepare("UPDATE matches SET score_a = ?, score_b = ?, winner_id = ? WHERE id = ?")
		.bind(scoreA, scoreB, winnerId, match.id)
		.run();

	// Auto-advance stages once the current one is complete.
	const updated = await disciplineMatches(db, match.discipline_id);
	if (stageComplete(updated, "group") && !updated.some((m) => m.stage === "semi")) {
		const groups = groupsOf(updated);
		if (groups.length === 2 && groups.every((g) => g.memberIds.length >= 2)) {
			const semis = seedSemis(groups.map((g) => g.standings));
			for (const [a, b] of semis) {
				await insertMatch(db, {
					disciplineId: match.discipline_id,
					stage: "semi",
					groupNo: null,
					round: null,
					playerA: a,
					playerB: b,
				});
			}
		}
	} else if (stageComplete(updated, "semi") && !updated.some((m) => m.stage === "final")) {
		const semis = updated.filter((m) => m.stage === "semi");
		const winners = semis.map((m) => m.winnerId!) as [number, number];
		const losers = semis.map((m) => (m.winnerId === m.playerA ? m.playerB : m.playerA)) as [
			number,
			number,
		];
		await insertMatch(db, {
			disciplineId: match.discipline_id,
			stage: "third",
			groupNo: null,
			round: null,
			playerA: losers[0],
			playerB: losers[1],
		});
		await insertMatch(db, {
			disciplineId: match.discipline_id,
			stage: "final",
			groupNo: null,
			round: null,
			playerA: winners[0],
			playerB: winners[1],
		});
	}

	return NextResponse.json({ ok: true });
}
