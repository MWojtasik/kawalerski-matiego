import { NextResponse } from "next/server";
import { getDb, getSetting } from "@/lib/db";

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const db = await getDb();
	if ((await getSetting(db, "locked_setup")) === "1") {
		return NextResponse.json({ error: "Turniej już wylosowany — setup zablokowany" }, { status: 409 });
	}
	const { id } = await params;
	await db.prepare("DELETE FROM players WHERE id = ?").bind(Number(id)).run();
	return NextResponse.json({ ok: true });
}
