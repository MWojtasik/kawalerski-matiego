import { NextResponse } from "next/server";
import { getDb, getSetting, loadDisciplines } from "@/lib/db";

export async function POST(request: Request) {
	const db = await getDb();
	if ((await getSetting(db, "locked_setup")) === "1") {
		return NextResponse.json({ error: "Turniej już wylosowany — zapisy zamknięte" }, { status: 409 });
	}
	const body = (await request.json()) as {
		name?: string;
		emoji?: string;
		disciplineIds?: number[];
	};
	const name = body.name?.trim() ?? "";
	if (name.length < 1 || name.length > 30) {
		return NextResponse.json({ error: "Ksywa musi mieć 1-30 znaków" }, { status: 400 });
	}
	const validIds = new Set((await loadDisciplines(db)).map((d) => d.id));
	const disciplineIds = [...new Set(body.disciplineIds ?? [])].filter((id) => validIds.has(id));
	if (disciplineIds.length === 0) {
		return NextResponse.json({ error: "Zaznacz przynajmniej jedną dyscyplinę" }, { status: 400 });
	}
	const emoji = body.emoji?.trim() || "🍺";
	const inserted = await db
		.prepare("INSERT INTO players (name, emoji) VALUES (?, ?) RETURNING id")
		.bind(name, emoji)
		.first<{ id: number }>();
	for (const disciplineId of disciplineIds) {
		await db
			.prepare("INSERT INTO player_disciplines (player_id, discipline_id) VALUES (?, ?)")
			.bind(inserted!.id, disciplineId)
			.run();
	}
	return NextResponse.json({ ok: true, id: inserted!.id });
}
