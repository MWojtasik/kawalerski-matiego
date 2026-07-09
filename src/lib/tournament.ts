import type { DisciplineStatus, Match, GeneralRow, StandingRow } from "./types";

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * How many groups for `n` players aiming at `targetSize` per group.
 * Capped at 4 because the playoff takes exactly 4 qualifiers.
 */
export function numGroupsFor(n: number, targetSize: number): number {
	return Math.min(4, Math.max(1, Math.round(n / targetSize)));
}

/** Split already-shuffled ids into `numGroups` groups, sizes differing by at most 1. */
export function splitIntoGroups(ids: number[], numGroups: number): number[][] {
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

/**
 * Standings for one group: a win is one point. Ties broken by wins in the
 * matches between the tied players; a full circle (A>B>C>A) stays tied and
 * falls back to player id — in real life settle it with a tie-break game and
 * edit the relevant result.
 */
export function computeStandings(memberIds: number[], matches: Match[]): StandingRow[] {
	const rows = new Map<number, StandingRow>(
		memberIds.map((id) => [id, { playerId: id, played: 0, wins: 0, losses: 0 }]),
	);
	const decided = matches.filter(
		(m) => m.winnerId !== null && rows.has(m.playerA) && rows.has(m.playerB),
	);
	for (const m of decided) {
		const a = rows.get(m.playerA)!;
		const b = rows.get(m.playerB)!;
		a.played++;
		b.played++;
		if (m.winnerId === m.playerA) {
			a.wins++;
			b.losses++;
		} else {
			b.wins++;
			a.losses++;
		}
	}
	const result = [...rows.values()].sort((x, y) => y.wins - x.wins || x.playerId - y.playerId);
	// re-sort each same-wins tier by head-to-head wins inside the tier
	const sorted: StandingRow[] = [];
	let i = 0;
	while (i < result.length) {
		let j = i;
		while (j < result.length && result[j].wins === result[i].wins) j++;
		const tier = result.slice(i, j);
		if (tier.length > 1) {
			const tierIds = new Set(tier.map((r) => r.playerId));
			const h2hWins = new Map<number, number>(tier.map((r) => [r.playerId, 0]));
			for (const m of decided) {
				if (tierIds.has(m.playerA) && tierIds.has(m.playerB)) {
					h2hWins.set(m.winnerId!, (h2hWins.get(m.winnerId!) ?? 0) + 1);
				}
			}
			tier.sort(
				(x, y) =>
					h2hWins.get(y.playerId)! - h2hWins.get(x.playerId)! || x.playerId - y.playerId,
			);
		}
		sorted.push(...tier);
		i = j;
	}
	return sorted;
}

export function stageComplete(matches: Match[], stage: Match["stage"]): boolean {
	const stageMatches = matches.filter((m) => m.stage === stage);
	return stageMatches.length > 0 && stageMatches.every((m) => m.winnerId !== null);
}

interface Seed {
	playerId: number;
	groupNo: number;
	wins: number;
	played: number;
}

function seedAt(groups: { no: number; standings: StandingRow[] }[], position: number): Seed[] {
	return groups
		.filter((g) => g.standings.length > position)
		.map((g) => {
			const row = g.standings[position];
			return { playerId: row.playerId, groupNo: g.no, wins: row.wins, played: row.played };
		})
		.sort((x, y) => y.wins - x.wins || x.played - y.played || x.playerId - y.playerId);
}

/**
 * Semifinal pairings for 1-4 groups (always 4 qualifiers):
 * - 1 group: places 1-4, pairs 1-4 and 2-3
 * - 2 groups: A1-B2 and B1-A2
 * - 3 groups: three winners + best runner-up (most wins, then fewer matches);
 *   the runner-up avoids their own group winner if possible
 * - 4 groups: four winners, best-vs-worst
 */
export function seedPlayoff(
	groups: { no: number; standings: StandingRow[] }[],
): [number, number][] | null {
	if (groups.length === 1) {
		const s = groups[0].standings;
		if (s.length < 4) return null;
		return [
			[s[0].playerId, s[3].playerId],
			[s[1].playerId, s[2].playerId],
		];
	}
	if (groups.length === 2) {
		const [a, b] = groups;
		if (a.standings.length < 2 || b.standings.length < 2) return null;
		return [
			[a.standings[0].playerId, b.standings[1].playerId],
			[b.standings[0].playerId, a.standings[1].playerId],
		];
	}
	const winners = seedAt(groups, 0);
	if (groups.length === 3) {
		const bestRunnerUp = seedAt(groups, 1)[0];
		if (!bestRunnerUp || winners.length < 3) return null;
		const [w1, w2, w3] = winners;
		return bestRunnerUp.groupNo === w1.groupNo
			? [
					[w1.playerId, w3.playerId],
					[w2.playerId, bestRunnerUp.playerId],
				]
			: [
					[w1.playerId, bestRunnerUp.playerId],
					[w2.playerId, w3.playerId],
				];
	}
	if (winners.length < 4) return null;
	return [
		[winners[0].playerId, winners[3].playerId],
		[winners[1].playerId, winners[2].playerId],
	];
}

export function disciplineStatus(matches: Match[]): DisciplineStatus {
	if (matches.length === 0) return "waiting";
	if (stageComplete(matches, "final")) return "done";
	if (matches.some((m) => m.stage !== "group")) return "playoff";
	return "group";
}

/**
 * Final placements: 1-2 from the final, 3-4 from the third-place match, the
 * rest tier by tier from group positions — everyone at the same group position
 * (who didn't qualify) shares a place, e.g. both 3rd places share place 5.
 */
export function disciplinePlacements(
	matches: Match[],
	standingsByGroup: StandingRow[][],
): Record<number, number> {
	const placements: Record<number, number> = {};
	const final = matches.find((m) => m.stage === "final");
	const third = matches.find((m) => m.stage === "third");
	if (!final?.winnerId) return placements;
	if (final?.winnerId) {
		placements[final.winnerId] = 1;
		placements[final.winnerId === final.playerA ? final.playerB : final.playerA] = 2;
	}
	if (third?.winnerId) {
		placements[third.winnerId] = 3;
		placements[third.winnerId === third.playerA ? third.playerB : third.playerA] = 4;
	}
	let place = 5;
	const maxSize = Math.max(0, ...standingsByGroup.map((s) => s.length));
	for (let position = 0; position < maxSize; position++) {
		const tier = standingsByGroup
			.map((s) => s[position])
			.filter((row) => row && placements[row.playerId] === undefined);
		for (const row of tier) placements[row.playerId] = place;
		place += tier.length;
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
 * final contribute points. Point ties broken by number of discipline wins.
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
