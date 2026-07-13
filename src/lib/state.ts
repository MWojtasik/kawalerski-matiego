import { FINISHED_AT_KEY, getSetting, loadDisciplines, loadMatches, loadPlayers, loadTeams } from "./db";
import {
	bracketPlacements,
	computeStandings,
	disciplinePlacements,
	disciplineStatus,
	expandTeamPlacements,
	expandTeamWins,
	generalClassification,
	matchWins,
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
	const [players, disciplines, matches, teams, finishedAt] = await Promise.all([
		loadPlayers(db),
		loadDisciplines(db),
		loadMatches(db),
		loadTeams(db),
		getSetting(db, FINISHED_AT_KEY),
	]);

	const disciplineStates: DisciplineState[] = disciplines.map((d) => {
		const dMatches = matches.filter((m) => m.disciplineId === d.id);
		const dTeams = teams.filter((t) => t.disciplineId === d.id);
		const groups = d.format === "bracket2v2" ? [] : groupsOf(dMatches);
		const placements =
			d.format === "bracket2v2"
				? expandTeamPlacements(bracketPlacements(dMatches), dTeams)
				: disciplinePlacements(
						dMatches,
						groups.map((g) => g.standings),
					);
		return {
			...d,
			status: disciplineStatus(dMatches),
			groups,
			teams: dTeams,
			matches: dMatches,
			placements,
		};
	});

	const winsBySlug: Record<string, Record<number, number>> = {};
	const placementsBySlug: Record<string, Record<number, number>> = {};
	for (const d of disciplineStates) {
		const entrantWins = matchWins(d.matches);
		const playerWins =
			d.format === "bracket2v2" ? expandTeamWins(entrantWins, d.teams) : entrantWins;
		if (Object.keys(playerWins).length > 0) winsBySlug[d.slug] = playerWins;
		if (Object.keys(d.placements).length > 0) placementsBySlug[d.slug] = d.placements;
	}

	return {
		players,
		allDrawn: disciplineStates.every((d) => d.status !== "waiting"),
		finished: finishedAt !== null,
		disciplines: disciplineStates,
		general: generalClassification(
			players.map((p) => p.id),
			winsBySlug,
			placementsBySlug,
		),
	};
}
