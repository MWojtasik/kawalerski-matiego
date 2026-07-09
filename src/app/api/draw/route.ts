import { NextResponse } from "next/server";
import { getDb, insertMatch, loadDisciplines, loadPlayers, setSetting } from "@/lib/db";
import { numGroupsFor, roundRobinRounds, shuffle, splitIntoGroups } from "@/lib/tournament";

export async function POST(request: Request) {
	const db = await getDb();
	const existing = await db.prepare("SELECT COUNT(*) AS n FROM matches").first<{ n: number }>();
	if ((existing?.n ?? 0) > 0) {
		return NextResponse.json({ error: "Losowanie już się odbyło" }, { status: 409 });
	}
	const body = (await request.json().catch(() => ({}))) as { groupSize?: number };
	const groupSize = [3, 4, 5].includes(body.groupSize ?? 0) ? body.groupSize! : 4;

	const players = await loadPlayers(db);
	const disciplines = await loadDisciplines(db);
	const skipped: string[] = [];
	let drawnAny = false;

	for (const discipline of disciplines) {
		const eligible = players.filter((p) => p.disciplineIds.includes(discipline.id));
		if (eligible.length < 4) {
			skipped.push(discipline.name);
			continue;
		}
		drawnAny = true;
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
	}

	if (!drawnAny) {
		return NextResponse.json(
			{ error: "Żadna dyscyplina nie ma minimum 4 chętnych" },
			{ status: 400 },
		);
	}
	await setSetting(db, "locked_setup", "1");
	return NextResponse.json({ ok: true, skipped });
}
