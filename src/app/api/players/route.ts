import { NextResponse } from "next/server";
import { drawnDisciplineIds, getDb, loadDisciplines } from "@/lib/db";

export async function POST(request: Request) {
	const db = await getDb();
	const [disciplines, drawn] = await Promise.all([loadDisciplines(db), drawnDisciplineIds(db)]);
	if (disciplines.every((d) => drawn.has(d.id))) {
		return NextResponse.json(
			{ error: "Wszystkie dyscypliny wylosowane — zapisy zamknięte" },
			{ status: 409 },
		);
	}
	const body = (await request.json()) as {
		name?: string;
		disciplineIds?: number[];
	};
	const name = body.name?.trim() ?? "";
	if (name.length < 1 || name.length > 30) {
		return NextResponse.json({ error: "Ksywa musi mieć 1-30 znaków" }, { status: 400 });
	}
	const validIds = new Set(disciplines.map((d) => d.id));
	const disciplineIds = [...new Set(body.disciplineIds ?? [])].filter((id) => validIds.has(id));
	if (disciplineIds.length === 0) {
		return NextResponse.json({ error: "Zaznacz przynajmniej jedną dyscyplinę" }, { status: 400 });
	}
	const closed = disciplineIds.find((id) => drawn.has(id));
	if (closed !== undefined) {
		const d = disciplines.find((x) => x.id === closed);
		return NextResponse.json(
			{ error: `Zapisy do ${d?.name ?? "dyscypliny"} już zamknięte (wylosowano)` },
			{ status: 400 },
		);
	}
	const inserted = await db
		.prepare("INSERT INTO players (name) VALUES (?) RETURNING id")
		.bind(name)
		.first<{ id: number }>();
	for (const disciplineId of disciplineIds) {
		await db
			.prepare("INSERT INTO player_disciplines (player_id, discipline_id) VALUES (?, ?)")
			.bind(inserted!.id, disciplineId)
			.run();
	}
	return NextResponse.json({ ok: true, id: inserted!.id });
}
