import { NextResponse } from "next/server";
import { getEnv, insertMatch, insertTeam, loadDisciplines, loadPlayers } from "@/lib/db";
import {
	numGroupsFor,
	pairTeams,
	roundRobinRounds,
	seedBracket,
	shuffle,
	splitIntoGroups,
} from "@/lib/tournament";

export async function POST(request: Request) {
	const env = await getEnv();
	const db = env.DB;
	const body = (await request.json().catch(() => ({}))) as {
		disciplineId?: number;
		groupSize?: number;
		pin?: string;
	};
	if (env.ADMIN_PIN && body.pin !== env.ADMIN_PIN) {
		return NextResponse.json({ error: "Zły PIN" }, { status: 403 });
	}
	const discipline = (await loadDisciplines(db)).find((d) => d.id === body.disciplineId);
	if (!discipline) {
		return NextResponse.json({ error: "Nie ma takiej dyscypliny" }, { status: 404 });
	}
	const existing = await db
		.prepare("SELECT COUNT(*) AS n FROM matches WHERE discipline_id = ?")
		.bind(discipline.id)
		.first<{ n: number }>();
	if ((existing?.n ?? 0) > 0) {
		return NextResponse.json({ error: "Ta dyscyplina jest już wylosowana" }, { status: 409 });
	}

	const players = await loadPlayers(db);
	const eligible = players.filter((p) => p.disciplineIds.includes(discipline.id));
	if (eligible.length < 4) {
		return NextResponse.json(
			{ error: `Za mało chętnych na ${discipline.name} (min. 4)` },
			{ status: 400 },
		);
	}

	if (discipline.format === "bracket2v2") {
		const { pairs } = pairTeams(eligible.map((p) => p.id));
		const teamIds: number[] = [];
		for (const [a, b] of pairs) teamIds.push(await insertTeam(db, discipline.id, a, b));
		const { stage, pairs: matchPairs } = seedBracket(teamIds);
		for (const [a, b] of matchPairs) {
			await insertMatch(db, {
				disciplineId: discipline.id,
				stage,
				groupNo: null,
				round: null,
				playerA: a,
				playerB: b,
			});
		}
		return NextResponse.json({ ok: true });
	}

	const groupSize = [3, 4, 5].includes(body.groupSize ?? 0) ? body.groupSize! : 4;
	const groups = splitIntoGroups(
		shuffle(eligible.map((p) => p.id)),
		numGroupsFor(eligible.length, groupSize),
	);
	for (const [groupIndex, memberIds] of groups.entries()) {
		const rounds = roundRobinRounds(memberIds);
		for (const [roundIndex, round] of rounds.entries()) {
			for (const [a, b] of round) {
				await insertMatch(db, {
					disciplineId: discipline.id,
					stage: "group",
					groupNo: groupIndex + 1,
					round: roundIndex + 1,
					playerA: a,
					playerB: b,
				});
			}
		}
	}
	return NextResponse.json({ ok: true });
}
