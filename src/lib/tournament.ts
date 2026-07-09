import type {
	DisciplineStatus,
	GeneralRow,
	Match,
	StandingRow,
} from "./types";

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** Split already-shuffled ids into `numGroups` groups, sizes differing by at most 1. */
export function splitIntoGroups(ids: number[], numGroups = 2): number[][] {
	const groups: number[][] = Array.from({ length: numGroups }, () => []);
	ids.forEach((id, i) => groups[i % numGroups].push(id));
	return groups;
}

/**
 * Circle-method round robin. Returns rounds, each round a list of [a, b] pairs.
 * Odd player counts get a bye (the missing pair is simply absent from the round).
 */
export function roundRobinRounds(ids: number[]): [number, number][][] {
	if (ids.length < 2) return [];
	const ring: (number | null)[] = [...ids];
	if (ring.length % 2 === 1) ring.push(null);
	const n = ring.length;
	const rounds: [number, number][][] = [];
	for (let r = 0; r < n - 1; r++) {
		const round: [number, number][] = [];
		for (let i = 0; i < n / 2; i++) {
			const a = ring[i];
			const b = ring[n - 1 - i];
			if (a !== null && b !== null) round.push([a, b]);
		}
		rounds.push(round);
		// rotate all but the first element
		ring.splice(1, 0, ring.pop() as number | null);
	}
	return rounds;
}

function headToHead(a: number, b: number, matches: Match[]): number {
	const match = matches.find(
		(m) =>
			m.winnerId !== null &&
			((m.playerA === a && m.playerB === b) || (m.playerA === b && m.playerB === a)),
	);
	if (!match) return 0;
	return match.winnerId === a ? -1 : 1;
}

/**
 * Standings for one group. Sort: wins desc, score diff desc, head-to-head,
 * score-for desc, id asc (stable last resort).
 */
export function computeStandings(memberIds: number[], matches: Match[]): StandingRow[] {
	const rows = new Map<number, StandingRow>(
		memberIds.map((id) => [
			id,
			{ playerId: id, played: 0, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0, diff: 0 },
		]),
	);
	for (const m of matches) {
		if (m.winnerId === null || m.scoreA === null || m.scoreB === null) continue;
		const a = rows.get(m.playerA);
		const b = rows.get(m.playerB);
		if (!a || !b) continue;
		a.played++;
		b.played++;
		a.scoreFor += m.scoreA;
		a.scoreAgainst += m.scoreB;
		b.scoreFor += m.scoreB;
		b.scoreAgainst += m.scoreA;
		if (m.winnerId === m.playerA) {
			a.wins++;
			b.losses++;
		} else {
			b.wins++;
			a.losses++;
		}
	}
	const result = [...rows.values()];
	for (const row of result) row.diff = row.scoreFor - row.scoreAgainst;
	result.sort(
		(x, y) =>
			y.wins - x.wins ||
			y.diff - x.diff ||
			headToHead(x.playerId, y.playerId, matches) ||
			y.scoreFor - x.scoreFor ||
			x.playerId - y.playerId,
	);
	return result;
}

export function stageComplete(matches: Match[], stage: Match["stage"]): boolean {
	const stageMatches = matches.filter((m) => m.stage === stage);
	return stageMatches.length > 0 && stageMatches.every((m) => m.winnerId !== null);
}

/** Semifinal pairings from group standings: A1-B2 and B1-A2. */
export function seedSemis(standingsByGroup: StandingRow[][]): [number, number][] {
	const [a, b] = standingsByGroup;
	return [
		[a[0].playerId, b[1].playerId],
		[b[0].playerId, a[1].playerId],
	];
}

export function disciplineStatus(matches: Match[]): DisciplineStatus {
	if (matches.length === 0) return "waiting";
	if (stageComplete(matches, "final")) return "done";
	if (matches.some((m) => m.stage !== "group")) return "playoff";
	return "group";
}

/**
 * Final placements for a finished (or partially finished) discipline.
 * 1-2 from the final, 3-4 from the third-place match, the rest from group
 * positions: both 3rd places share place 5, both 4th places share place 7, etc.
 */
export function disciplinePlacements(
	matches: Match[],
	standingsByGroup: StandingRow[][],
): Record<number, number> {
	const placements: Record<number, number> = {};
	const final = matches.find((m) => m.stage === "final");
	const third = matches.find((m) => m.stage === "third");
	if (final?.winnerId) {
		placements[final.winnerId] = 1;
		placements[final.winnerId === final.playerA ? final.playerB : final.playerA] = 2;
	}
	if (third?.winnerId) {
		placements[third.winnerId] = 3;
		placements[third.winnerId === third.playerA ? third.playerB : third.playerA] = 4;
	}
	for (const standings of standingsByGroup) {
		standings.forEach((row, index) => {
			if (placements[row.playerId] === undefined && index >= 2) {
				placements[row.playerId] = 2 * (index - 2) + 5;
			}
		});
	}
	return placements;
}

export function pointsForPlace(place: number): number {
	if (place === 1) return 10;
	if (place === 2) return 7;
	if (place === 3) return 5;
	if (place === 4) return 4;
	if (place === 5) return 2;
	return 1;
}

/**
 * General classification across disciplines. Only disciplines with a decided
 * final contribute points. Sorted by total points desc, then by number of
 * discipline wins, then name order left to the caller (id asc here).
 */
export function generalClassification(
	playerIds: number[],
	placementsBySlug: Record<string, Record<number, number>>,
): GeneralRow[] {
	const rows: GeneralRow[] = playerIds.map((playerId) => {
		const breakdown: Record<string, number> = {};
		for (const [slug, placements] of Object.entries(placementsBySlug)) {
			const place = placements[playerId];
			if (place !== undefined) breakdown[slug] = pointsForPlace(place);
		}
		const points = Object.values(breakdown).reduce((sum, p) => sum + p, 0);
		return { playerId, points, breakdown };
	});
	const winsOf = (row: GeneralRow) =>
		Object.entries(placementsBySlug).filter(([, p]) => p[row.playerId] === 1).length;
	rows.sort((x, y) => y.points - x.points || winsOf(y) - winsOf(x) || x.playerId - y.playerId);
	return rows;
}
