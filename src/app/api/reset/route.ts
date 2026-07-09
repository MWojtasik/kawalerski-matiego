import { NextResponse } from "next/server";
import { getEnv } from "@/lib/db";

export async function POST(request: Request) {
	const env = await getEnv();
	const body = (await request.json()) as { pin?: string; scope?: "draw" | "all" };
	if (env.ADMIN_PIN && body.pin !== env.ADMIN_PIN) {
		return NextResponse.json({ error: "Zły PIN" }, { status: 403 });
	}
	const db = env.DB;
	await db.prepare("DELETE FROM matches").run();
	await db.prepare("DELETE FROM teams").run();
	if (body.scope === "all") {
		await db.prepare("DELETE FROM player_disciplines").run();
		await db.prepare("DELETE FROM players").run();
	}
	return NextResponse.json({ ok: true });
}
