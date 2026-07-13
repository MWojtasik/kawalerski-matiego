import { describe, expect, it } from "vitest";
import {
	bracketDrawPreview,
	bracketPlacements,
	computeStandings,
	disciplinePlacements,
	disciplineStatus,
	expandTeamPlacements,
	expandTeamWins,
	generalClassification,
	groupDrawPreview,
	matchWins,
	nextBracketMatches,
	numGroupsFor,
	pairTeams,
	recapStats,
	recentResults,
	roundRobinRounds,
	seedBracket,
	seedPlayoff,
	shuffle,
	splitIntoGroups,
	stageComplete,
	upcomingMatches,
} from "../src/lib/tournament";
import type {
	DisciplineState,
	Match,
	Stage,
	StandingRow,
	TournamentState,
} from "../src/lib/types";

let nextId = 1;
function match(partial: {
	stage?: Stage;
	groupNo?: number | null;
	winner: number;
	loser: number;
	decidedAt?: string | null;
}): Match {
	const { stage = "group", groupNo = 1, winner, loser, decidedAt = "2026-07-09T12:00:00.000Z" } =
		partial;
	return {
		id: nextId++,
		disciplineId: 1,
		stage,
		groupNo,
		round: null,
		playerA: winner,
		playerB: loser,
		winnerId: winner,
		decidedAt,
	};
}

function pending(a: number, b: number, groupNo = 1): Match {
	return {
		id: nextId++,
		disciplineId: 1,
		stage: "group",
		groupNo,
		round: null,
		playerA: a,
		playerB: b,
		winnerId: null,
		decidedAt: null,
	};
}

/** full round robin where earlier ids beat later ids */
function sweepGroup(ids: number[], groupNo: number): Match[] {
	const result: Match[] = [];
	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			result.push(match({ groupNo, winner: ids[i], loser: ids[j] }));
		}
	}
	return result;
}

describe("numGroupsFor", () => {
	it("aims at the target size", () => {
		expect(numGroupsFor(11, 4)).toBe(3); // 4/4/3
		expect(numGroupsFor(12, 4)).toBe(3);
		expect(numGroupsFor(10, 5)).toBe(2);
		expect(numGroupsFor(9, 3)).toBe(3);
		expect(numGroupsFor(4, 4)).toBe(1);
		expect(numGroupsFor(5, 4)).toBe(1); // no degenerate group of 1-2
	});

	it("caps at 4 groups (playoff takes 4 qualifiers)", () => {
		expect(numGroupsFor(20, 3)).toBe(4);
	});
});

describe("splitIntoGroups", () => {
	it("splits 11 players into 4/4/3", () => {
		const groups = splitIntoGroups([...Array(11).keys()], 3);
		expect(groups.map((g) => g.length)).toEqual([4, 4, 3]);
	});
});

describe("shuffle", () => {
	it("keeps all elements", () => {
		expect([...shuffle([1, 2, 3, 4, 5])].sort()).toEqual([1, 2, 3, 4, 5]);
	});
});

describe("roundRobinRounds", () => {
	it("generates all pairings exactly once for 3 players (with byes)", () => {
		const rounds = roundRobinRounds([1, 2, 3]);
		const pairs = rounds.flat().map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join("-"));
		expect(pairs).toHaveLength(3);
		expect(new Set(pairs).size).toBe(3);
	});

	it("generates all pairings exactly once for 4 players", () => {
		const rounds = roundRobinRounds([1, 2, 3, 4]);
		expect(rounds).toHaveLength(3);
		const pairs = rounds.flat().map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join("-"));
		expect(pairs).toHaveLength(6);
		expect(new Set(pairs).size).toBe(6);
	});

	it("no player plays twice in one round", () => {
		for (const round of roundRobinRounds([1, 2, 3, 4, 5, 6])) {
			const ids = round.flat();
			expect(new Set(ids).size).toBe(ids.length);
		}
	});
});

describe("computeStandings", () => {
	it("one point per win", () => {
		const matches = [
			match({ winner: 1, loser: 2 }),
			match({ winner: 1, loser: 3 }),
			match({ winner: 2, loser: 3 }),
		];
		const standings = computeStandings([1, 2, 3], matches);
		expect(standings.map((r) => [r.playerId, r.wins])).toEqual([
			[1, 2],
			[2, 1],
			[3, 0],
		]);
	});

	it("breaks a two-way tie by the head-to-head match", () => {
		// 2 beat 1 directly, both finish 2 wins; id order would put 1 first
		const matches = [
			match({ winner: 2, loser: 1 }),
			match({ winner: 1, loser: 3 }),
			match({ winner: 1, loser: 4 }),
			match({ winner: 2, loser: 3 }),
			match({ winner: 4, loser: 2 }),
			match({ winner: 3, loser: 4 }),
		];
		const standings = computeStandings([1, 2, 3, 4], matches);
		expect(standings[0].playerId).toBe(2);
		expect(standings[1].playerId).toBe(1);
	});

	it("full circle stays in id order (tie-break game in real life)", () => {
		const matches = [
			match({ winner: 1, loser: 2 }),
			match({ winner: 2, loser: 3 }),
			match({ winner: 3, loser: 1 }),
		];
		const standings = computeStandings([1, 2, 3], matches);
		expect(standings.map((r) => r.playerId)).toEqual([1, 2, 3]);
	});

	it("ignores pending matches and other groups' players", () => {
		const standings = computeStandings([1, 2], [pending(1, 2), match({ winner: 5, loser: 6 })]);
		expect(standings[0].played).toBe(0);
	});
});

describe("seedPlayoff", () => {
	const groupOf = (no: number, ids: number[]): { no: number; standings: StandingRow[] } => ({
		no,
		standings: computeStandings(ids, sweepGroup(ids, no)),
	});

	it("1 group: 1-4 and 2-3", () => {
		expect(seedPlayoff([groupOf(1, [1, 2, 3, 4, 5])])).toEqual([
			[1, 4],
			[2, 3],
		]);
	});

	it("2 groups: A1-B2 and B1-A2", () => {
		expect(seedPlayoff([groupOf(1, [1, 2, 3]), groupOf(2, [4, 5, 6])])).toEqual([
			[1, 5],
			[4, 2],
		]);
	});

	it("3 groups: winners + best runner-up, avoiding own group winner", () => {
		// groups of 4/4/3: runners-up have 2/2/1 wins -> best runner-up is id 2 (group 1)
		const pairs = seedPlayoff([
			groupOf(1, [1, 2, 5, 6]),
			groupOf(2, [3, 4, 7, 8]),
			groupOf(3, [9, 10, 11]),
		]);
		// winners: 1 (3W), 3 (3W), 9 (2W); best runner-up: 2 or 4 (2W each, id tiebreak -> 2)
		// 2 is from group 1 = winner 1's group -> avoid: [1 vs 9], [3 vs 2]
		expect(pairs).toEqual([
			[1, 9],
			[3, 2],
		]);
	});

	it("4 groups: winners best-vs-worst", () => {
		const pairs = seedPlayoff([
			groupOf(1, [1, 5, 9]),
			groupOf(2, [2, 6, 10]),
			groupOf(3, [3, 7, 11]),
			groupOf(4, [4, 8, 12]),
		]);
		// all winners 2W; played equal; id order: 1,2,3,4
		expect(pairs).toEqual([
			[1, 4],
			[2, 3],
		]);
	});

	it("returns null when a playoff cannot be seeded", () => {
		expect(seedPlayoff([groupOf(1, [1, 2, 3])])).toBeNull();
	});
});

describe("stageComplete", () => {
	it("only when every stage match has a winner", () => {
		expect(stageComplete([match({ winner: 1, loser: 2 }), pending(3, 4)], "group")).toBe(false);
		expect(stageComplete([match({ winner: 1, loser: 2 })], "group")).toBe(true);
		expect(stageComplete([], "group")).toBe(false);
	});
});

describe("disciplinePlacements", () => {
	it("assigns 1-4 from playoff and shares tail places tier by tier", () => {
		const groupA = sweepGroup([1, 2, 5, 6], 1);
		const groupB = sweepGroup([3, 4, 7, 8], 2);
		const playoff = [
			match({ stage: "semi", groupNo: null, winner: 1, loser: 4 }),
			match({ stage: "semi", groupNo: null, winner: 2, loser: 3 }),
			match({ stage: "third", groupNo: null, winner: 3, loser: 4 }),
			match({ stage: "final", groupNo: null, winner: 1, loser: 2 }),
		];
		const standings = [
			computeStandings([1, 2, 5, 6], groupA),
			computeStandings([3, 4, 7, 8], groupB),
		];
		const placements = disciplinePlacements([...groupA, ...groupB, ...playoff], standings);
		expect(placements[1]).toBe(1);
		expect(placements[2]).toBe(2);
		expect(placements[3]).toBe(3);
		expect(placements[4]).toBe(4);
		expect(placements[5]).toBe(5);
		expect(placements[7]).toBe(5);
		expect(placements[6]).toBe(7);
		expect(placements[8]).toBe(7);
	});

	it("with 3 groups the non-qualified runner-up lands in the first tail tier", () => {
		const groups = [sweepGroup([1, 2, 5], 1), sweepGroup([3, 4, 6], 2), sweepGroup([7, 8, 9], 3)];
		const standings = [
			computeStandings([1, 2, 5], groups[0]),
			computeStandings([3, 4, 6], groups[1]),
			computeStandings([7, 8, 9], groups[2]),
		];
		// qualifiers: winners 1, 3, 7 + best runner-up 2
		const playoff = [
			match({ stage: "semi", groupNo: null, winner: 1, loser: 2 }),
			match({ stage: "semi", groupNo: null, winner: 3, loser: 7 }),
			match({ stage: "third", groupNo: null, winner: 7, loser: 2 }),
			match({ stage: "final", groupNo: null, winner: 1, loser: 3 }),
		];
		const placements = disciplinePlacements([...groups.flat(), ...playoff], standings);
		expect(placements[1]).toBe(1);
		expect(placements[3]).toBe(2);
		expect(placements[7]).toBe(3);
		expect(placements[2]).toBe(4);
		// tail: remaining runners-up 4, 8 share place 5; last places 5, 6, 9 share 7
		expect(placements[4]).toBe(5);
		expect(placements[8]).toBe(5);
		expect(placements[5]).toBe(7);
		expect(placements[6]).toBe(7);
		expect(placements[9]).toBe(7);
	});

	it("returns no tail placements before the playoff is decided", () => {
		const groupMatches = [match({ winner: 1, loser: 2 })];
		const placements = disciplinePlacements(groupMatches, [computeStandings([1, 2], groupMatches)]);
		expect(placements[1]).toBeUndefined();
	});
});

describe("disciplineStatus", () => {
	it("walks waiting -> group -> playoff -> done", () => {
		expect(disciplineStatus([])).toBe("waiting");
		expect(disciplineStatus([pending(1, 2)])).toBe("group");
		expect(
			disciplineStatus([
				match({ winner: 1, loser: 2 }),
				{ ...pending(1, 2), stage: "semi", groupNo: null },
			]),
		).toBe("playoff");
		expect(disciplineStatus([match({ stage: "final", groupNo: null, winner: 1, loser: 2 })])).toBe(
			"done",
		);
	});

	it("a bracket-only discipline is in playoff from the first pending match", () => {
		expect(disciplineStatus([bpending("quarter", 1, 2)])).toBe("playoff");
	});
});

/** decided bracket match (groupNo null) */
function bmatch(stage: Stage, winner: number, loser: number): Match {
	return match({ stage, groupNo: null, winner, loser });
}

/** pending bracket match */
function bpending(stage: Stage, a: number, b: number): Match {
	return { ...pending(a, b), stage, groupNo: null };
}

describe("groupDrawPreview", () => {
	it("11 players at ~4 -> 4/4/3, 15 group matches + 4 playoff", () => {
		expect(groupDrawPreview(11, 4)).toEqual({
			groupSizes: [4, 4, 3],
			groupMatches: 15,
			playoffMatches: 4,
			total: 19,
		});
	});

	it("4 players -> single group of 4, 6 + 4 matches", () => {
		expect(groupDrawPreview(4, 4)).toEqual({
			groupSizes: [4],
			groupMatches: 6,
			playoffMatches: 4,
			total: 10,
		});
	});
});

describe("bracketDrawPreview", () => {
	it("computes teams, sit-out and match count", () => {
		expect(bracketDrawPreview(4)).toEqual({ teams: 2, sitOut: false, matches: 1 });
		expect(bracketDrawPreview(6)).toEqual({ teams: 3, sitOut: false, matches: 2 });
		expect(bracketDrawPreview(7)).toEqual({ teams: 3, sitOut: true, matches: 2 });
		expect(bracketDrawPreview(8)).toEqual({ teams: 4, sitOut: false, matches: 4 });
		expect(bracketDrawPreview(9)).toEqual({ teams: 4, sitOut: true, matches: 4 });
		expect(bracketDrawPreview(16)).toEqual({ teams: 8, sitOut: false, matches: 8 });
	});
});

describe("pairTeams", () => {
	it("even count: everyone plays exactly once, nobody sits out", () => {
		const { pairs, sitOutId } = pairTeams([1, 2, 3, 4, 5, 6]);
		expect(sitOutId).toBeNull();
		expect([...pairs.flat()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it("odd count: exactly one player sits out", () => {
		const { pairs, sitOutId } = pairTeams([1, 2, 3, 4, 5]);
		expect(sitOutId).not.toBeNull();
		expect(pairs).toHaveLength(2);
		expect(new Set([...pairs.flat(), sitOutId!]).size).toBe(5);
	});

	it("is deterministic with an injected rand", () => {
		const rand = () => 0;
		expect(pairTeams([1, 2, 3, 4, 5], rand)).toEqual(pairTeams([1, 2, 3, 4, 5], rand));
	});
});

describe("seedBracket", () => {
	it("2 teams: straight final", () => {
		expect(seedBracket([1, 2])).toEqual({ stage: "final", pairs: [[1, 2]], byeTeamIds: [] });
	});

	it("3 teams: one semi, first team byes towards the final", () => {
		expect(seedBracket([1, 2, 3])).toEqual({ stage: "semi", pairs: [[2, 3]], byeTeamIds: [1] });
	});

	it("4 teams: two semis, no byes", () => {
		expect(seedBracket([1, 2, 3, 4])).toEqual({
			stage: "semi",
			pairs: [
				[1, 2],
				[3, 4],
			],
			byeTeamIds: [],
		});
	});

	it("5-8 teams: quarters + byes, everyone placed exactly once", () => {
		for (let t = 5; t <= 8; t++) {
			const ids = [...Array(t).keys()].map((i) => i + 1);
			const { stage, pairs, byeTeamIds } = seedBracket(ids);
			expect(stage).toBe("quarter");
			expect(pairs).toHaveLength(t - 4);
			expect(byeTeamIds).toHaveLength(8 - t);
			const placed = [...pairs.flat(), ...byeTeamIds];
			expect(new Set(placed).size).toBe(t);
		}
	});
});

describe("nextBracketMatches", () => {
	const teamIds = [1, 2, 3, 4, 5, 6];

	it("quarters complete -> semis from byes + winners, each team once", () => {
		// 6 teams: byes 1,2; quarters (3,4) and (5,6)
		const matches = [bmatch("quarter", 3, 4), bmatch("quarter", 5, 6)];
		const next = nextBracketMatches(matches, teamIds);
		expect(next.map((m) => m.stage)).toEqual(["semi", "semi"]);
		const ids = next.flatMap((m) => [m.playerA, m.playerB]);
		expect([...ids].sort()).toEqual([1, 2, 3, 5]);
	});

	it("quarters partially decided -> nothing", () => {
		expect(
			nextBracketMatches([bmatch("quarter", 3, 4), bpending("quarter", 5, 6)], teamIds),
		).toEqual([]);
	});

	it("single semi decided (3 teams) -> final against the double-bye team, no third", () => {
		const next = nextBracketMatches([bmatch("semi", 2, 3)], [1, 2, 3]);
		expect(next).toEqual([{ stage: "final", playerA: 1, playerB: 2 }]);
	});

	it("both semis decided -> third from losers + final from winners", () => {
		const next = nextBracketMatches([bmatch("semi", 1, 2), bmatch("semi", 3, 4)], [1, 2, 3, 4]);
		expect(next).toEqual([
			{ stage: "third", playerA: 2, playerB: 4 },
			{ stage: "final", playerA: 1, playerB: 3 },
		]);
	});

	it("final already exists -> nothing", () => {
		const matches = [bmatch("semi", 1, 2), bmatch("semi", 3, 4), bpending("final", 1, 3)];
		expect(nextBracketMatches(matches, [1, 2, 3, 4])).toEqual([]);
	});
});

describe("bracketPlacements", () => {
	it("full 8-team run: 1-4 from playoff, quarter losers share 5th", () => {
		const matches = [
			bmatch("quarter", 1, 2),
			bmatch("quarter", 3, 4),
			bmatch("quarter", 5, 6),
			bmatch("quarter", 7, 8),
			bmatch("semi", 1, 3),
			bmatch("semi", 5, 7),
			bmatch("third", 3, 7),
			bmatch("final", 1, 5),
		];
		expect(bracketPlacements(matches)).toEqual({ 1: 1, 5: 2, 3: 3, 7: 4, 2: 5, 4: 5, 6: 5, 8: 5 });
	});

	it("3 teams: the lone semi's loser takes 3rd", () => {
		const matches = [bmatch("semi", 2, 3), bmatch("final", 1, 2)];
		expect(bracketPlacements(matches)).toEqual({ 1: 1, 2: 2, 3: 3 });
	});

	it("2 teams: just the final", () => {
		expect(bracketPlacements([bmatch("final", 1, 2)])).toEqual({ 1: 1, 2: 2 });
	});

	it("empty until the final is decided", () => {
		expect(bracketPlacements([bmatch("semi", 1, 2), bpending("final", 1, 3)])).toEqual({});
	});
});

describe("expandTeamPlacements", () => {
	it("both members inherit the team's place", () => {
		const teams = [
			{ id: 10, disciplineId: 4, playerA: 1, playerB: 2 },
			{ id: 11, disciplineId: 4, playerA: 3, playerB: 4 },
		];
		expect(expandTeamPlacements({ 10: 1, 11: 5 }, teams)).toEqual({ 1: 1, 2: 1, 3: 5, 4: 5 });
	});
});

describe("matchWins", () => {
	it("counts decided matches per winner across stages, ignoring pending", () => {
		const matches = [
			match({ winner: 1, loser: 2 }),
			match({ winner: 1, loser: 3 }),
			match({ stage: "final", groupNo: null, winner: 1, loser: 4 }),
			match({ winner: 2, loser: 3 }),
			pending(1, 4),
		];
		expect(matchWins(matches)).toEqual({ 1: 3, 2: 1 });
	});
});

describe("expandTeamWins", () => {
	it("both members inherit the team's win count", () => {
		const teams = [
			{ id: 10, disciplineId: 4, playerA: 1, playerB: 2 },
			{ id: 11, disciplineId: 4, playerA: 3, playerB: 4 },
		];
		expect(expandTeamWins({ 10: 2, 11: 1 }, teams)).toEqual({ 1: 2, 2: 2, 3: 1, 4: 1 });
	});
});

describe("generalClassification", () => {
	it("gives one point per match won and sums across disciplines", () => {
		const rows = generalClassification([1, 2, 3], {
			bilard: { 1: 3, 2: 2, 3: 0 },
			dart: { 1: 1, 2: 2 },
		});
		expect(rows[0].playerId).toBe(1);
		expect(rows[0].points).toBe(4);
		expect(rows[0].breakdown).toEqual({ bilard: 3, dart: 1 });
		expect(rows.find((r) => r.playerId === 2)?.points).toBe(4);
		expect(rows.find((r) => r.playerId === 3)?.points).toBe(0);
	});

	it("omits a discipline from the breakdown when the player has no wins there", () => {
		const rows = generalClassification([1, 2], { bilard: { 1: 2 } });
		expect(rows.find((r) => r.playerId === 1)?.breakdown).toEqual({ bilard: 2 });
		expect(rows.find((r) => r.playerId === 2)?.points).toBe(0);
	});

	it("breaks point ties by number of disciplines won", () => {
		const rows = generalClassification(
			[1, 2],
			{ bilard: { 1: 2, 2: 2 }, dart: { 1: 1, 2: 1 } },
			{ bilard: { 1: 1, 2: 2 } },
		);
		expect(rows[0].playerId).toBe(1);
	});
});

function disc(over: Partial<DisciplineState>): DisciplineState {
	return {
		id: 1,
		slug: "bilard",
		name: "Bilard",
		icon: "🎱",
		format: "groups",
		status: "group",
		groups: [],
		teams: [],
		matches: [],
		placements: {},
		...over,
	};
}

function stateOf(disciplines: DisciplineState[]): TournamentState {
	return { players: [], allDrawn: false, finished: false, disciplines, general: [] };
}

/** decided match with an explicit timestamp */
function stamped(winner: number, loser: number, decidedAt: string): Match {
	return match({ winner, loser, decidedAt });
}

describe("recentResults", () => {
	it("returns decided matches newest first, with the loser derived", () => {
		const state = stateOf([
			disc({
				matches: [
					stamped(1, 2, "2026-07-09T10:00:00.000Z"),
					stamped(3, 4, "2026-07-09T12:00:00.000Z"),
					pending(5, 6),
				],
			}),
		]);
		const feed = recentResults(state);
		expect(feed).toHaveLength(2);
		expect(feed[0].winnerId).toBe(3);
		expect(feed[0].loserId).toBe(4);
		expect(feed[1].winnerId).toBe(1);
	});

	it("sinks rows without a timestamp to the bottom and respects the limit", () => {
		const state = stateOf([
			disc({
				matches: [
					match({ winner: 7, loser: 8, decidedAt: null }),
					stamped(1, 2, "2026-07-09T10:00:00.000Z"),
					stamped(3, 4, "2026-07-09T11:00:00.000Z"),
				],
			}),
		]);
		const feed = recentResults(state, 2);
		expect(feed).toHaveLength(2);
		expect(feed.map((r) => r.winnerId)).toEqual([3, 1]);
	});
});

describe("upcomingMatches", () => {
	it("collects undecided matches only from running disciplines", () => {
		const state = stateOf([
			disc({ id: 1, status: "group", matches: [pending(1, 2), match({ winner: 1, loser: 2 })] }),
			disc({ id: 2, slug: "dart", status: "waiting", matches: [pending(3, 4)] }),
			disc({ id: 3, slug: "pong", status: "done", matches: [pending(5, 6)] }),
			disc({ id: 4, slug: "foos", status: "playoff", matches: [pending(7, 8)] }),
		]);
		const up = upcomingMatches(state);
		expect(up.map((l) => l.disciplineId).sort()).toEqual([1, 4]);
	});

	it("orders a discipline's queue by stage, then round", () => {
		const final: Match = { ...pending(1, 2), stage: "final", groupNo: null };
		const semi: Match = { ...pending(3, 4), stage: "semi", groupNo: null };
		const round2: Match = { ...pending(5, 6), round: 2 };
		const round1: Match = { ...pending(7, 8), round: 1 };
		const state = stateOf([disc({ status: "playoff", matches: [final, semi, round2, round1] })]);
		expect(upcomingMatches(state).map((l) => l.match.playerA)).toEqual([7, 5, 3, 1]);
	});

	it("interleaves disciplines so every table's next match comes first", () => {
		const state = stateOf([
			disc({ id: 1, matches: [pending(1, 2), pending(3, 4)] }),
			disc({ id: 2, slug: "dart", matches: [pending(5, 6), pending(7, 8)] }),
		]);
		expect(upcomingMatches(state).map((l) => l.match.playerA)).toEqual([1, 5, 3, 7]);
	});

	it("respects the limit", () => {
		const state = stateOf([disc({ matches: [pending(1, 2), pending(3, 4), pending(5, 6)] })]);
		expect(upcomingMatches(state, 2)).toHaveLength(2);
	});
});

describe("recapStats", () => {
	it("summarises a finished groups discipline", () => {
		const matches = [
			stamped(1, 2, "2026-07-09T10:00:00.000Z"),
			stamped(1, 3, "2026-07-09T10:05:00.000Z"),
			stamped(2, 3, "2026-07-09T10:10:00.000Z"),
		];
		const state: TournamentState = {
			players: [
				{ id: 1, name: "A", disciplineIds: [1] },
				{ id: 2, name: "B", disciplineIds: [1] },
				{ id: 3, name: "C", disciplineIds: [1] },
			],
			allDrawn: true,
			finished: false,
			disciplines: [disc({ status: "done", matches, placements: { 1: 1, 2: 2, 3: 3 } })],
			general: [
				{ playerId: 1, points: 2, breakdown: { bilard: 2 } },
				{ playerId: 2, points: 1, breakdown: { bilard: 1 } },
				{ playerId: 3, points: 0, breakdown: {} },
			],
		};
		const r = recapStats(state);
		expect(r.totalPlayers).toBe(3);
		expect(r.decidedMatches).toBe(3);
		expect(r.championId).toBe(1);
		expect(r.podium.map((p) => p.playerId)).toEqual([1, 2]);
		expect(r.disciplineChampions[0].playerIds).toEqual([1]);
		expect(r.unbeatenIds).toEqual([1]);
		expect(r.mostActive).toEqual({ playerId: 1, played: 2 });
		expect(r.unlucky).toEqual({ playerId: 3, losses: 2 });
		expect(r.table).toEqual([
			{ playerId: 1, points: 2, wins: 2, losses: 0, placements: { bilard: 1 } },
			{ playerId: 2, points: 1, wins: 1, losses: 1, placements: { bilard: 2 } },
			{ playerId: 3, points: 0, wins: 0, losses: 2, placements: { bilard: 3 } },
		]);
		expect(r.longestStreak).toEqual({ playerId: 1, length: 2 });
	});

	it("table follows general order and omits placements the player didn't earn", () => {
		const state: TournamentState = {
			players: [
				{ id: 1, name: "A", disciplineIds: [1, 2] },
				{ id: 2, name: "B", disciplineIds: [1] },
			],
			allDrawn: true,
			finished: false,
			disciplines: [
				disc({
					status: "done",
					matches: [stamped(1, 2, "2026-07-09T10:00:00.000Z")],
					placements: { 1: 1, 2: 2 },
				}),
				disc({ id: 2, slug: "dart", name: "Dart", icon: "🎯", status: "done", placements: { 1: 1 } }),
			],
			general: [
				{ playerId: 1, points: 1, breakdown: { bilard: 1 } },
				{ playerId: 2, points: 0, breakdown: {} },
			],
		};
		expect(recapStats(state).table).toEqual([
			{ playerId: 1, points: 1, wins: 1, losses: 0, placements: { bilard: 1, dart: 1 } },
			{ playerId: 2, points: 0, wins: 0, losses: 1, placements: { bilard: 2 } },
		]);
	});

	it("counts the win streak across disciplines in decided-at order", () => {
		const state = stateOf([
			disc({
				matches: [
					stamped(1, 2, "2026-07-09T10:00:00.000Z"),
					stamped(1, 2, "2026-07-09T10:30:00.000Z"),
					stamped(1, 2, "2026-07-09T10:45:00.000Z"),
				],
			}),
			// a loss in another discipline splits what would otherwise be a run of 3
			disc({
				id: 2,
				slug: "dart",
				matches: [stamped(3, 1, "2026-07-09T10:15:00.000Z")],
			}),
		]);
		expect(recapStats(state).longestStreak).toEqual({ playerId: 1, length: 2 });
	});

	it("breaks streak-length ties by lower player id and ignores single wins", () => {
		const tied = stateOf([
			disc({
				matches: [
					stamped(5, 1, "2026-07-09T10:00:00.000Z"),
					stamped(5, 1, "2026-07-09T10:10:00.000Z"),
					stamped(3, 2, "2026-07-09T10:20:00.000Z"),
					stamped(3, 2, "2026-07-09T10:30:00.000Z"),
				],
			}),
		]);
		expect(recapStats(tied).longestStreak).toEqual({ playerId: 3, length: 2 });

		const singles = stateOf([
			disc({
				matches: [
					stamped(1, 2, "2026-07-09T10:00:00.000Z"),
					stamped(2, 1, "2026-07-09T10:10:00.000Z"),
					stamped(1, 2, "2026-07-09T10:20:00.000Z"),
				],
			}),
		]);
		expect(recapStats(singles).longestStreak).toBeNull();
	});

	it("counts matches without a decided-at timestamp first in the streak order", () => {
		const state = stateOf([
			disc({
				matches: [
					match({ winner: 1, loser: 2, decidedAt: null }),
					stamped(1, 3, "2026-07-09T10:00:00.000Z"),
					stamped(2, 1, "2026-07-09T11:00:00.000Z"),
				],
			}),
		]);
		expect(recapStats(state).longestStreak).toEqual({ playerId: 1, length: 2 });
	});

	it("credits 2v2 team results to both members", () => {
		const state: TournamentState = {
			players: [4, 5, 6, 7].map((id) => ({ id, name: `P${id}`, disciplineIds: [2] })),
			allDrawn: true,
			finished: false,
			disciplines: [
				disc({
					id: 2,
					slug: "foos",
					name: "Piłkarzyki",
					icon: "⚽",
					format: "bracket2v2",
					status: "done",
					teams: [
						{ id: 10, disciplineId: 2, playerA: 4, playerB: 5 },
						{ id: 11, disciplineId: 2, playerA: 6, playerB: 7 },
					],
					matches: [match({ stage: "final", groupNo: null, winner: 10, loser: 11 })],
					placements: { 4: 1, 5: 1, 6: 2, 7: 2 },
				}),
			],
			general: [
				{ playerId: 4, points: 1, breakdown: { foos: 1 } },
				{ playerId: 5, points: 1, breakdown: { foos: 1 } },
				{ playerId: 6, points: 0, breakdown: {} },
				{ playerId: 7, points: 0, breakdown: {} },
			],
		};
		const r = recapStats(state);
		expect(r.disciplineChampions[0].playerIds).toEqual([4, 5]);
		expect(r.unbeatenIds).toEqual([4, 5]);
		expect(r.unlucky).toEqual({ playerId: 6, losses: 1 });
		expect(r.table[0]).toEqual({
			playerId: 4,
			points: 1,
			wins: 1,
			losses: 0,
			placements: { foos: 1 },
		});
		expect(r.longestStreak).toBeNull();
	});
});
