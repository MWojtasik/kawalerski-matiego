import { NextResponse } from "next/server";
import { deleteSetting, FINISHED_AT_KEY, getEnv, putSetting } from "@/lib/db";

/** Organizer ends (or resumes) the tournament: freezes results, unlocks the recap. */
export async function POST(request: Request) {
	const env = await getEnv();
	const body = (await request.json()) as { pin?: string; finished?: boolean };
	if (env.ADMIN_PIN && body.pin !== env.ADMIN_PIN) {
		return NextResponse.json({ error: "Zły PIN" }, { status: 403 });
	}
	if (body.finished === false) {
		await deleteSetting(env.DB, FINISHED_AT_KEY);
	} else {
		await putSetting(env.DB, FINISHED_AT_KEY, new Date().toISOString());
	}
	return NextResponse.json({ ok: true });
}
