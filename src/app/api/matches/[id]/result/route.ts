import { NextResponse } from "next/server";
import { getDb, insertMatch, toMatch, type MatchRow } from "@/lib/db";
import { groupsOf } from "@/lib/state";
import { nextBracketMatches, seedPlayoff, stageComplete } from "@/lib/tournament";
import type { DisciplineFormat, Match } from "@/lib/types";

async function disciplineMatches(db: D1Database, disciplineId: number): Promise<Match[]> {
	const { results } = await db
		.prepare("SELECT * FROM matches WHERE discipline_id = ? ORDER BY id")
		.bind(disciplineId)
		.all<MatchRow>();
	return results.map(toMatch);
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

	const body = (await request.json()) as { winnerId?: number };
	const winnerId = Number(body.winnerId);
	if (winnerId !== match.player_a && winnerId !== match.player_b) {
		return NextResponse.json({ error: "Zwycięzca musi być jednym z grających" }, { status: 400 });
	}

	const all = await disciplineMatches(db, match.discipline_id);
	if (match.stage === "group" && all.some((m) => m.stage !== "group")) {
		return NextResponse.json(
			{ error: "Playoff już wystartował — wyniki grupy zamrożone (użyj resetu, jeśli trzeba)" },
			{ status: 409 },
		);
	}
	if (match.stage === "quarter" && all.some((m) => m.stage === "semi")) {
		return NextResponse.json(
			{ error: "Półfinały już utworzone — wynik ćwierćfinału zamrożony" },
			{ status: 409 },
		);
	}
	if (match.stage === "semi" && all.some((m) => m.stage === "final")) {
		return NextResponse.json(
			{ error: "Finał już utworzony — wynik półfinału zamrożony" },
			{ status: 409 },
		);
	}

	await db.prepare("UPDATE matches SET winner_id = ? WHERE id = ?").bind(winnerId, match.id).run();

	// Auto-advance stages once the current one is complete.
	const updated = await disciplineMatches(db, match.discipline_id);
	const discipline = await db
		.prepare("SELECT format FROM disciplines WHERE id = ?")
		.bind(match.discipline_id)
		.first<{ format: DisciplineFormat }>();

	if (discipline?.format === "bracket2v2") {
		const { results: teamRows } = await db
			.prepare("SELECT id FROM teams WHERE discipline_id = ? ORDER BY id")
			.bind(match.discipline_id)
			.all<{ id: number }>();
		for (const next of nextBracketMatches(updated, teamRows.map((t) => t.id))) {
			await insertMatch(db, {
				disciplineId: match.discipline_id,
				stage: next.stage,
				groupNo: null,
				round: null,
				playerA: next.playerA,
				playerB: next.playerB,
			});
		}
	} else if (stageComplete(updated, "group") && !updated.some((m) => m.stage === "semi")) {
		const semis = seedPlayoff(groupsOf(updated));
		if (semis) {
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
