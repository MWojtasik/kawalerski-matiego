import { NextResponse } from "next/server";
import { deleteSetting, FINISHED_AT_KEY, getEnv } from "@/lib/db";

export async function POST(request: Request) {
	const env = await getEnv();
	const body = (await request.json()) as {
		pin?: string;
		scope?: "discipline" | "draw" | "all";
		disciplineId?: number;
	};
	if (env.ADMIN_PIN && body.pin !== env.ADMIN_PIN) {
		return NextResponse.json({ error: "Zły PIN" }, { status: 403 });
	}
	const db = env.DB;
	// Any reset means the tournament is being played again — lift the finish freeze.
	await deleteSetting(db, FINISHED_AT_KEY);
	if (body.scope === "discipline") {
		if (!body.disciplineId) {
			return NextResponse.json({ error: "Brak dyscypliny" }, { status: 400 });
		}
		await db.prepare("DELETE FROM matches WHERE discipline_id = ?").bind(body.disciplineId).run();
		await db.prepare("DELETE FROM teams WHERE discipline_id = ?").bind(body.disciplineId).run();
		return NextResponse.json({ ok: true });
	}
	await db.prepare("DELETE FROM matches").run();
	await db.prepare("DELETE FROM teams").run();
	if (body.scope === "all") {
		await db.prepare("DELETE FROM player_disciplines").run();
		await db.prepare("DELETE FROM players").run();
	}
	return NextResponse.json({ ok: true });
}
