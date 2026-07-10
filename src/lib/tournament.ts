import type {
	DisciplineFormat,
	DisciplineStatus,
	Match,
	GeneralRow,
	Stage,
	StandingRow,
	Team,
	TournamentState,
} from "./types";

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

/** Preview of a group-format draw: group sizes and how many matches it produces. */
export function groupDrawPreview(
	n: number,
	targetSize: number,
): { groupSizes: number[]; groupMatches: number; playoffMatches: number; total: number } {
	const groupSizes = splitIntoGroups([...Array(n).keys()], numGroupsFor(n, targetSize)).map(
		(g) => g.length,
	);
	const groupMatches = groupSizes.reduce((sum, k) => sum + (k * (k - 1)) / 2, 0);
	return { groupSizes, groupMatches, playoffMatches: 4, total: groupMatches + 4 };
}

/** Preview of a 2v2 bracket draw for `n` interested players. */
export function bracketDrawPreview(n: number): {
	teams: number;
	sitOut: boolean;
	matches: number;
} {
	const teams = Math.floor(n / 2);
	// T>=4: (T-4) quarters + 2 semis + third + final = T; T=3: semi + final; T=2: final
	const matches = teams >= 4 ? teams : teams === 3 ? 2 : teams === 2 ? 1 : 0;
	return { teams, sitOut: n % 2 === 1, matches };
}

/** Random 2v2 pairing; an odd player count leaves one random player out. */
export function pairTeams(
	playerIds: number[],
	rand: () => number = Math.random,
): { pairs: [number, number][]; sitOutId: number | null } {
	const shuffled = shuffle(playerIds, rand);
	const sitOutId = shuffled.length % 2 === 1 ? (shuffled.pop() as number) : null;
	const pairs: [number, number][] = [];
	for (let i = 0; i < shuffled.length; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);
	return { pairs, sitOutId };
}

/**
 * First knockout round for 2-8 teams (ids already in random order).
 * 5-8 teams: the last 2*(T-4) teams play quarterfinals, the rest get a bye
 * straight to the semis. 3 teams: one semi, the first team byes to the final.
 */
export function seedBracket(teamIds: number[]): {
	stage: Extract<Stage, "quarter" | "semi" | "final">;
	pairs: [number, number][];
	byeTeamIds: number[];
} {
	const t = teamIds.length;
	if (t === 2) return { stage: "final", pairs: [[teamIds[0], teamIds[1]]], byeTeamIds: [] };
	if (t === 3) {
		return { stage: "semi", pairs: [[teamIds[1], teamIds[2]]], byeTeamIds: [teamIds[0]] };
	}
	if (t === 4) {
		return {
			stage: "semi",
			pairs: [
				[teamIds[0], teamIds[1]],
				[teamIds[2], teamIds[3]],
			],
			byeTeamIds: [],
		};
	}
	const byeTeamIds = teamIds.slice(0, 8 - t);
	const playing = teamIds.slice(8 - t);
	const pairs: [number, number][] = [];
	for (let i = 0; i < playing.length; i += 2) pairs.push([playing[i], playing[i + 1]]);
	return { stage: "quarter", pairs, byeTeamIds };
}

/**
 * Bracket matches to insert after a result, or [] when nothing advances yet.
 * Quarters complete -> semis from [byes..., quarter winners...];
 * semis complete -> third + final (with a single semi, T=3, just the final:
 * the double-bye team meets the semi winner and the semi loser takes 3rd).
 */
export function nextBracketMatches(
	matches: Match[],
	teamIds: number[],
): { stage: Stage; playerA: number; playerB: number }[] {
	const quarters = matches.filter((m) => m.stage === "quarter");
	const semis = matches.filter((m) => m.stage === "semi");
	if (quarters.length > 0 && semis.length === 0) {
		if (!stageComplete(matches, "quarter")) return [];
		const inQuarter = new Set(quarters.flatMap((m) => [m.playerA, m.playerB]));
		const s = [
			...teamIds.filter((id) => !inQuarter.has(id)),
			...quarters.map((m) => m.winnerId!),
		];
		return [
			{ stage: "semi", playerA: s[0], playerB: s[3] },
			{ stage: "semi", playerA: s[1], playerB: s[2] },
		];
	}
	if (semis.length > 0 && !matches.some((m) => m.stage === "final")) {
		if (!stageComplete(matches, "semi")) return [];
		if (semis.length === 1) {
			const played = new Set(matches.flatMap((m) => [m.playerA, m.playerB]));
			const bye = teamIds.find((id) => !played.has(id))!;
			return [{ stage: "final", playerA: bye, playerB: semis[0].winnerId! }];
		}
		const winners = semis.map((m) => m.winnerId!);
		const losers = semis.map((m) => (m.winnerId === m.playerA ? m.playerB : m.playerA));
		return [
			{ stage: "third", playerA: losers[0], playerB: losers[1] },
			{ stage: "final", playerA: winners[0], playerB: winners[1] },
		];
	}
	return [];
}

/**
 * Team placements for a bracket discipline; {} until the final is decided.
 * 1-2 from the final, 3-4 from the third-place match (or the lone semi's
 * loser when no third match exists), quarterfinal losers all share 5th.
 */
export function bracketPlacements(matches: Match[]): Record<number, number> {
	const placements: Record<number, number> = {};
	const final = matches.find((m) => m.stage === "final");
	if (!final?.winnerId) return placements;
	placements[final.winnerId] = 1;
	placements[final.winnerId === final.playerA ? final.playerB : final.playerA] = 2;
	const third = matches.find((m) => m.stage === "third");
	if (third) {
		if (third.winnerId) {
			placements[third.winnerId] = 3;
			placements[third.winnerId === third.playerA ? third.playerB : third.playerA] = 4;
		}
	} else {
		for (const m of matches.filter((x) => x.stage === "semi" && x.winnerId !== null)) {
			const loser = m.winnerId === m.playerA ? m.playerB : m.playerA;
			if (placements[loser] === undefined) placements[loser] = 3;
		}
	}
	for (const m of matches.filter((x) => x.stage === "quarter" && x.winnerId !== null)) {
		placements[m.winnerId === m.playerA ? m.playerB : m.playerA] = 5;
	}
	return placements;
}

/** Both members of each team inherit the team's placement. */
export function expandTeamPlacements(
	teamPlacements: Record<number, number>,
	teams: Team[],
): Record<number, number> {
	const result: Record<number, number> = {};
	for (const team of teams) {
		const place = teamPlacements[team.id];
		if (place !== undefined) {
			result[team.playerA] = place;
			result[team.playerB] = place;
		}
	}
	return result;
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

/** Decided matches won, per entrant (winnerId), across every stage. */
export function matchWins(matches: Match[]): Record<number, number> {
	const wins: Record<number, number> = {};
	for (const m of matches) {
		if (m.winnerId !== null) wins[m.winnerId] = (wins[m.winnerId] ?? 0) + 1;
	}
	return wins;
}

/** Both members of a team inherit the team's win count. */
export function expandTeamWins(
	entrantWins: Record<number, number>,
	teams: Team[],
): Record<number, number> {
	const result: Record<number, number> = {};
	for (const team of teams) {
		const wins = entrantWins[team.id];
		if (wins) {
			result[team.playerA] = wins;
			result[team.playerB] = wins;
		}
	}
	return result;
}

/**
 * Live general classification across disciplines: one point per match won,
 * counted the moment a result is entered (no waiting for finals). Point ties
 * broken by number of disciplines won, then player id.
 */
export function generalClassification(
	playerIds: number[],
	winsBySlug: Record<string, Record<number, number>>,
	placementsBySlug: Record<string, Record<number, number>> = {},
): GeneralRow[] {
	const rows: GeneralRow[] = playerIds.map((playerId) => {
		const breakdown: Record<string, number> = {};
		for (const [slug, wins] of Object.entries(winsBySlug)) {
			const won = wins[playerId];
			if (won) breakdown[slug] = won;
		}
		const points = Object.values(breakdown).reduce((sum, p) => sum + p, 0);
		return { playerId, points, breakdown };
	});
	const titlesOf = (row: GeneralRow) =>
		Object.values(placementsBySlug).filter((p) => p[row.playerId] === 1).length;
	rows.sort((x, y) => y.points - x.points || titlesOf(y) - titlesOf(x) || x.playerId - y.playerId);
	return rows;
}

/** A decided match, flattened with its discipline, for the TV live feed. */
export interface FeedResult {
	disciplineId: number;
	slug: string;
	icon: string;
	name: string;
	format: DisciplineFormat;
	stage: Stage;
	/** entrant ids: player ids for group disciplines, team ids for 2v2 */
	winnerId: number;
	loserId: number;
	decidedAt: string | null;
}

/**
 * Every decided match across disciplines, newest first (by `decidedAt`).
 * Rows without a timestamp (pre-migration) sink to the bottom. Used by the TV
 * screen's "co się dzieje" feed; name resolution stays in the view.
 */
export function recentResults(state: TournamentState, limit = 12): FeedResult[] {
	const items: FeedResult[] = [];
	for (const d of state.disciplines) {
		for (const m of d.matches) {
			if (m.winnerId === null) continue;
			items.push({
				disciplineId: d.id,
				slug: d.slug,
				icon: d.icon,
				name: d.name,
				format: d.format,
				stage: m.stage,
				winnerId: m.winnerId,
				loserId: m.winnerId === m.playerA ? m.playerB : m.playerA,
				decidedAt: m.decidedAt,
			});
		}
	}
	items.sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
	return items.slice(0, limit);
}

/** An undecided match in a running discipline, flattened with its discipline. */
export interface LiveMatch {
	disciplineId: number;
	slug: string;
	icon: string;
	name: string;
	format: DisciplineFormat;
	match: Match;
}

/** Undecided matches in disciplines that are currently playing (group/playoff). */
export function liveMatches(state: TournamentState, limit = 8): LiveMatch[] {
	const items: LiveMatch[] = [];
	for (const d of state.disciplines) {
		if (d.status !== "group" && d.status !== "playoff") continue;
		for (const m of d.matches) {
			if (m.winnerId === null) {
				items.push({
					disciplineId: d.id,
					slug: d.slug,
					icon: d.icon,
					name: d.name,
					format: d.format,
					match: m,
				});
			}
		}
	}
	return items.slice(0, limit);
}

export interface RecapStats {
	totalPlayers: number;
	decidedMatches: number;
	/** overall winner (general leader); null if nobody scored */
	championId: number | null;
	podium: { playerId: number; points: number }[];
	disciplineChampions: {
		disciplineId: number;
		slug: string;
		name: string;
		icon: string;
		/** two players for a 2v2 discipline, one otherwise */
		playerIds: number[];
	}[];
	/** played > 0 and never lost, across every discipline */
	unbeatenIds: number[];
	/** the "played the most matches" award; null with no matches */
	mostActive: { playerId: number; played: number } | null;
	/** the "pechowiec" — most losses (tie: fewest wins, then lowest id); null if nobody lost */
	unlucky: { playerId: number; losses: number } | null;
	/** one row per player, ordered like the general classification */
	table: {
		playerId: number;
		/** general-classification points (one per match won) */
		points: number;
		wins: number;
		losses: number;
		/** slug -> final place; missing key = didn't place in that discipline */
		placements: Record<string, number>;
	}[];
	/** longest consecutive-wins run (by decidedAt order); null if nobody won twice in a row */
	longestStreak: { playerId: number; length: number } | null;
}

/**
 * End-of-tournament recap numbers, derived purely from state. Team results are
 * credited to both members, so wins/losses are per player. Meant for the
 * `/recap` page once every discipline is done.
 */
export function recapStats(state: TournamentState): RecapStats {
	const record = new Map<number, { wins: number; losses: number; played: number }>();
	const bump = (id: number, won: boolean) => {
		const r = record.get(id) ?? { wins: 0, losses: 0, played: 0 };
		r.played++;
		if (won) r.wins++;
		else r.losses++;
		record.set(id, r);
	};

	let decidedMatches = 0;
	const decided: {
		decidedAt: string | null;
		matchId: number;
		winners: number[];
		losers: number[];
	}[] = [];
	for (const d of state.disciplines) {
		const teamMembers = new Map<number, number[]>(d.teams.map((t) => [t.id, [t.playerA, t.playerB]]));
		const membersOf = (entrantId: number) => teamMembers.get(entrantId) ?? [entrantId];
		for (const m of d.matches) {
			if (m.winnerId === null) continue;
			decidedMatches++;
			const loserEntrant = m.winnerId === m.playerA ? m.playerB : m.playerA;
			for (const p of membersOf(m.winnerId)) bump(p, true);
			for (const p of membersOf(loserEntrant)) bump(p, false);
			decided.push({
				decidedAt: m.decidedAt,
				matchId: m.id,
				winners: membersOf(m.winnerId),
				losers: membersOf(loserEntrant),
			});
		}
	}

	const scored = state.general.filter((r) => r.points > 0);
	const podium = scored.slice(0, 3).map((r) => ({ playerId: r.playerId, points: r.points }));

	const disciplineChampions = state.disciplines
		.map((d) => ({
			disciplineId: d.id,
			slug: d.slug,
			name: d.name,
			icon: d.icon,
			playerIds: Object.entries(d.placements)
				.filter(([, place]) => place === 1)
				.map(([id]) => Number(id))
				.sort((a, b) => a - b),
		}))
		.filter((c) => c.playerIds.length > 0);

	const entries = [...record.entries()];
	const unbeatenIds = entries
		.filter(([, r]) => r.played > 0 && r.losses === 0)
		.map(([id]) => id)
		.sort((a, b) => a - b);

	let mostActive: { playerId: number; played: number } | null = null;
	for (const [id, r] of entries) {
		if (
			mostActive === null ||
			r.played > mostActive.played ||
			(r.played === mostActive.played && id < mostActive.playerId)
		) {
			mostActive = { playerId: id, played: r.played };
		}
	}

	let unlucky: { playerId: number; losses: number } | null = null;
	let worst = { losses: 0, wins: Infinity, id: Infinity };
	for (const [id, r] of entries) {
		if (r.losses === 0) continue;
		if (
			r.losses > worst.losses ||
			(r.losses === worst.losses && (r.wins < worst.wins || (r.wins === worst.wins && id < worst.id)))
		) {
			worst = { losses: r.losses, wins: r.wins, id };
			unlucky = { playerId: id, losses: r.losses };
		}
	}

	const table = state.general.map((row) => {
		const r = record.get(row.playerId);
		const placements: Record<string, number> = {};
		for (const d of state.disciplines) {
			const place = d.placements[row.playerId];
			if (place !== undefined) placements[d.slug] = place;
		}
		return {
			playerId: row.playerId,
			points: row.points,
			wins: r?.wins ?? 0,
			losses: r?.losses ?? 0,
			placements,
		};
	});

	// Streaks follow the order results were entered; pre-migration rows without a
	// timestamp sort first so they don't split a later run.
	decided.sort(
		(a, b) => (a.decidedAt ?? "").localeCompare(b.decidedAt ?? "") || a.matchId - b.matchId,
	);
	const currentRun = new Map<number, number>();
	const bestRun = new Map<number, number>();
	for (const m of decided) {
		for (const p of m.winners) {
			const run = (currentRun.get(p) ?? 0) + 1;
			currentRun.set(p, run);
			if (run > (bestRun.get(p) ?? 0)) bestRun.set(p, run);
		}
		for (const p of m.losers) currentRun.set(p, 0);
	}
	let longestStreak: { playerId: number; length: number } | null = null;
	for (const [id, length] of bestRun) {
		if (
			length >= 2 &&
			(longestStreak === null ||
				length > longestStreak.length ||
				(length === longestStreak.length && id < longestStreak.playerId))
		) {
			longestStreak = { playerId: id, length };
		}
	}

	return {
		totalPlayers: state.players.length,
		decidedMatches,
		championId: podium[0]?.playerId ?? null,
		podium,
		disciplineChampions,
		unbeatenIds,
		mostActive,
		unlucky,
		table,
		longestStreak,
	};
}
