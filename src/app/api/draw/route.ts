import { NextResponse } from "next/server";
import { getDb, insertMatch, loadDisciplines, loadPlayers, setSetting } from "@/lib/db";
import { roundRobinRounds, shuffle, splitIntoGroups } from "@/lib/tournament";

export async function POST() {
	const db = await getDb();
	const existing = await db.prepare("SELECT COUNT(*) AS n FROM matches").first<{ n: number }>();
	if ((existing?.n ?? 0) > 0) {
		return NextResponse.json({ error: "Losowanie już się odbyło" }, { status: 409 });
	}
	const players = await loadPlayers(db);
	if (players.length < 4) {
		return NextResponse.json({ error: "Potrzeba minimum 4 graczy" }, { status: 400 });
	}
	const disciplines = await loadDisciplines(db);
	for (const discipline of disciplines) {
		const groups = splitIntoGroups(shuffle(players.map((p) => p.id)));
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
	await setSetting(db, "locked_setup", "1");
	return NextResponse.json({ ok: true });
}
