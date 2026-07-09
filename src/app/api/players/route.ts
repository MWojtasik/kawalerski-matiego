import { NextResponse } from "next/server";
import { getDb, getSetting } from "@/lib/db";

export async function POST(request: Request) {
	const db = await getDb();
	if ((await getSetting(db, "locked_setup")) === "1") {
		return NextResponse.json({ error: "Turniej już wylosowany — setup zablokowany" }, { status: 409 });
	}
	const body = (await request.json()) as { name?: string; emoji?: string };
	const name = body.name?.trim() ?? "";
	if (name.length < 1 || name.length > 30) {
		return NextResponse.json({ error: "Imię musi mieć 1-30 znaków" }, { status: 400 });
	}
	const emoji = body.emoji?.trim() || "🍺";
	await db.prepare("INSERT INTO players (name, emoji) VALUES (?, ?)").bind(name, emoji).run();
	return NextResponse.json({ ok: true });
}
