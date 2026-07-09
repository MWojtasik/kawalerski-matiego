import { NextResponse } from "next/server";
import { drawnDisciplineIds, getDb, loadDisciplines } from "@/lib/db";

async function playerDisciplineIds(db: D1Database, playerId: number): Promise<number[]> {
	const { results } = await db
		.prepare("SELECT discipline_id FROM player_disciplines WHERE player_id = ?")
		.bind(playerId)
		.all<{ discipline_id: number }>();
	return results.map((r) => r.discipline_id);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const db = await getDb();
	const { id } = await params;
	const playerId = Number(id);
	const [current, drawn] = await Promise.all([
		playerDisciplineIds(db, playerId),
		drawnDisciplineIds(db),
	]);
	if (current.some((d) => drawn.has(d))) {
		return NextResponse.json(
			{ error: "Gracz jest w wylosowanej dyscyplinie — nie można usunąć" },
			{ status: 409 },
		);
	}
	await db.prepare("DELETE FROM player_disciplines WHERE player_id = ?").bind(playerId).run();
	await db.prepare("DELETE FROM players WHERE id = ?").bind(playerId).run();
	return NextResponse.json({ ok: true });
}

/** Update a player's signups; memberships in already-drawn disciplines are immutable. */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const db = await getDb();
	const { id } = await params;
	const playerId = Number(id);
	const player = await db
		.prepare("SELECT id FROM players WHERE id = ?")
		.bind(playerId)
		.first<{ id: number }>();
	if (!player) {
		return NextResponse.json({ error: "Nie ma takiego gracza" }, { status: 404 });
	}
	const body = (await request.json()) as { disciplineIds?: number[] };
	const [disciplines, drawn, current] = await Promise.all([
		loadDisciplines(db),
		drawnDisciplineIds(db),
		playerDisciplineIds(db, playerId),
	]);
	const validIds = new Set(disciplines.map((d) => d.id));
	const requested = [...new Set(body.disciplineIds ?? [])].filter((x) => validIds.has(x));
	if (requested.length === 0) {
		return NextResponse.json({ error: "Zaznacz przynajmniej jedną dyscyplinę" }, { status: 400 });
	}
	const currentDrawn = new Set(current.filter((x) => drawn.has(x)));
	const requestedDrawn = new Set(requested.filter((x) => drawn.has(x)));
	if (
		currentDrawn.size !== requestedDrawn.size ||
		[...currentDrawn].some((x) => !requestedDrawn.has(x))
	) {
		return NextResponse.json(
			{ error: "Zapisów w wylosowanych dyscyplinach nie da się zmienić" },
			{ status: 409 },
		);
	}
	await db.prepare("DELETE FROM player_disciplines WHERE player_id = ?").bind(playerId).run();
	for (const disciplineId of requested) {
		await db
			.prepare("INSERT INTO player_disciplines (player_id, discipline_id) VALUES (?, ?)")
			.bind(playerId, disciplineId)
			.run();
	}
	return NextResponse.json({ ok: true });
}
