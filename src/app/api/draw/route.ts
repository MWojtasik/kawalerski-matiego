import { NextResponse } from "next/server";
import { getEnv, insertMatch, loadDisciplines, loadPlayers, setSetting } from "@/lib/db";
import { numGroupsFor, roundRobinRounds, shuffle, splitIntoGroups } from "@/lib/tournament";

export async function POST(request: Request) {
	const env = await getEnv();
	const db = env.DB;
	const body = (await request.json().catch(() => ({}))) as { groupSize?: number; pin?: string };
	if (env.ADMIN_PIN && body.pin !== env.ADMIN_PIN) {
		return NextResponse.json({ error: "Zły PIN" }, { status: 403 });
	}
	const existing = await db.prepare("SELECT COUNT(*) AS n FROM matches").first<{ n: number }>();
	if ((existing?.n ?? 0) > 0) {
		return NextResponse.json({ error: "Losowanie już się odbyło" }, { status: 409 });
	}
	const groupSize = [3, 4, 5].includes(body.groupSize ?? 0) ? body.groupSize! : 4;

	const players = await loadPlayers(db);
	const disciplines = await loadDisciplines(db);
	const short = disciplines.filter(
		(d) => players.filter((p) => p.disciplineIds.includes(d.id)).length < 4,
	);
	if (short.length > 0) {
		return NextResponse.json(
			{ error: `Za mało chętnych (min. 4): ${short.map((d) => d.name).join(", ")}` },
			{ status: 400 },
		);
	}

	for (const discipline of disciplines) {
		const eligible = players.filter((p) => p.disciplineIds.includes(discipline.id));
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

	await setSetting(db, "locked_setup", "1");
	return NextResponse.json({ ok: true });
}
