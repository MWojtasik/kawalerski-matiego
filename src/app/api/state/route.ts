import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
	const db = await getDb();
	const state = await buildState(db);
	return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
