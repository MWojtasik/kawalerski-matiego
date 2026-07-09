import { getSetting, loadDisciplines, loadMatches, loadPlayers } from "./db";
import {
	computeStandings,
	disciplinePlacements,
	disciplineStatus,
	generalClassification,
	stageComplete,
} from "./tournament";
import type { DisciplineState, GroupState, Match, TournamentState } from "./types";

export function groupsOf(matches: Match[]): GroupState[] {
	const members = new Map<number, Set<number>>();
	for (const m of matches) {
		if (m.stage !== "group" || m.groupNo === null) continue;
		if (!members.has(m.groupNo)) members.set(m.groupNo, new Set());
		members.get(m.groupNo)!.add(m.playerA);
		members.get(m.groupNo)!.add(m.playerB);
	}
	return [...members.entries()]
		.sort(([a], [b]) => a - b)
		.map(([no, ids]) => {
			const groupMatches = matches.filter((m) => m.stage === "group" && m.groupNo === no);
			return {
				no,
				memberIds: [...ids],
				standings: computeStandings([...ids], groupMatches),
				complete: groupMatches.every((m) => m.winnerId !== null),
			};
		});
}

export async function buildState(db: D1Database): Promise<TournamentState> {
	const [players, disciplines, matches, locked] = await Promise.all([
		loadPlayers(db),
		loadDisciplines(db),
		loadMatches(db),
		getSetting(db, "locked_setup"),
	]);

	const disciplineStates: DisciplineState[] = disciplines.map((d) => {
		const dMatches = matches.filter((m) => m.disciplineId === d.id);
		const groups = groupsOf(dMatches);
		const placements = stageComplete(dMatches, "final")
			? disciplinePlacements(
					dMatches,
					groups.map((g) => g.standings),
				)
			: {};
		return {
			...d,
			status: disciplineStatus(dMatches),
			groups,
			matches: dMatches,
			placements,
		};
	});

	const placementsBySlug: Record<string, Record<number, number>> = {};
	for (const d of disciplineStates) {
		if (Object.keys(d.placements).length > 0) placementsBySlug[d.slug] = d.placements;
	}

	return {
		players,
		lockedSetup: locked === "1",
		disciplines: disciplineStates,
		general: generalClassification(
			players.map((p) => p.id),
			placementsBySlug,
		),
	};
}
