import { describe, expect, it } from "vitest";
import {
	computeStandings,
	disciplinePlacements,
	disciplineStatus,
	generalClassification,
	pointsForPlace,
	roundRobinRounds,
	seedSemis,
	shuffle,
	splitIntoGroups,
	stageComplete,
} from "../src/lib/tournament";
import type { Match, Stage } from "../src/lib/types";

let nextId = 1;
function match(partial: {
	stage?: Stage;
	groupNo?: number | null;
	a: number;
	b: number;
	scoreA?: number | null;
	scoreB?: number | null;
}): Match {
	const { stage = "group", groupNo = 1, a, b, scoreA = null, scoreB = null } = partial;
	const winnerId =
		scoreA !== null && scoreB !== null ? (scoreA > scoreB ? a : b) : null;
	return {
		id: nextId++,
		disciplineId: 1,
		stage,
		groupNo,
		round: null,
		playerA: a,
		playerB: b,
		scoreA,
		scoreB,
		winnerId,
	};
}

describe("splitIntoGroups", () => {
	it("splits 10 players into two groups of 5", () => {
		const groups = splitIntoGroups([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(groups[0]).toHaveLength(5);
		expect(groups[1]).toHaveLength(5);
	});

	it("splits 11 players into 6 + 5", () => {
		const groups = splitIntoGroups([...Array(11).keys()]);
		expect(groups[0]).toHaveLength(6);
		expect(groups[1]).toHaveLength(5);
	});
});

describe("shuffle", () => {
	it("keeps all elements", () => {
		const shuffled = shuffle([1, 2, 3, 4, 5]);
		expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
	});
});

describe("roundRobinRounds", () => {
	it("generates all pairings exactly once for 5 players (with byes)", () => {
		const rounds = roundRobinRounds([1, 2, 3, 4, 5]);
		expect(rounds).toHaveLength(5);
		const pairs = rounds.flat().map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join("-"));
		expect(pairs).toHaveLength(10); // C(5,2)
		expect(new Set(pairs).size).toBe(10);
		for (const round of rounds) expect(round).toHaveLength(2);
	});

	it("generates all pairings exactly once for 6 players", () => {
		const rounds = roundRobinRounds([1, 2, 3, 4, 5, 6]);
		expect(rounds).toHaveLength(5);
		const pairs = rounds.flat().map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join("-"));
		expect(pairs).toHaveLength(15); // C(6,2)
		expect(new Set(pairs).size).toBe(15);
		for (const round of rounds) expect(round).toHaveLength(3);
	});

	it("no player plays twice in one round", () => {
		for (const round of roundRobinRounds([1, 2, 3, 4, 5, 6])) {
			const ids = round.flat();
			expect(new Set(ids).size).toBe(ids.length);
		}
	});
});

describe("computeStandings", () => {
	it("orders by wins, then score diff", () => {
		const matches = [
			match({ a: 1, b: 2, scoreA: 5, scoreB: 0 }),
			match({ a: 1, b: 3, scoreA: 5, scoreB: 4 }),
			match({ a: 2, b: 3, scoreA: 5, scoreB: 3 }),
		];
		const standings = computeStandings([1, 2, 3], matches);
		// 1: 2 wins; 2: 1 win diff -3+2=-3... compute: 2 lost 0:5, won 5:3 => diff -3; 3: 0 wins
		expect(standings.map((r) => r.playerId)).toEqual([1, 2, 3]);
		expect(standings[0].wins).toBe(2);
		expect(standings[1].diff).toBe(-3);
	});

	it("breaks equal wins and diff by head-to-head", () => {
		const matches = [
			match({ a: 1, b: 2, scoreA: 3, scoreB: 2 }), // 1 beats 2
			match({ a: 2, b: 3, scoreA: 3, scoreB: 2 }), // 2 beats 3
			match({ a: 3, b: 1, scoreA: 3, scoreB: 2 }), // 3 beats 1 -> full circle, all 1W/1L, diff 0
		];
		const standings = computeStandings([1, 2, 3], matches);
		expect(standings.every((r) => r.wins === 1 && r.diff === 0)).toBe(true);
		// falls through h2h circle to scoreFor: all 5 -> id order
		expect(standings.map((r) => r.playerId)).toEqual([1, 2, 3]);
	});

	it("counts unplayed matches as not played", () => {
		const matches = [match({ a: 1, b: 2 })];
		const standings = computeStandings([1, 2], matches);
		expect(standings[0].played).toBe(0);
	});
});

describe("playoff", () => {
	it("stageComplete only when every stage match has a winner", () => {
		const matches = [
			match({ a: 1, b: 2, scoreA: 3, scoreB: 1 }),
			match({ a: 3, b: 4 }),
		];
		expect(stageComplete(matches, "group")).toBe(false);
		expect(stageComplete([match({ a: 1, b: 2, scoreA: 3, scoreB: 1 })], "group")).toBe(true);
		expect(stageComplete([], "group")).toBe(false);
	});

	it("seeds semis A1-B2 and B1-A2", () => {
		const groupA = computeStandings([1, 2], [match({ a: 1, b: 2, scoreA: 2, scoreB: 0 })]);
		const groupB = computeStandings([3, 4], [match({ a: 3, b: 4, scoreA: 2, scoreB: 0 })]);
		expect(seedSemis([groupA, groupB])).toEqual([
			[1, 4],
			[3, 2],
		]);
	});
});

describe("disciplinePlacements", () => {
	it("assigns 1-4 from playoff and shares 5/7 for group tails", () => {
		// groups of 4: [1,2,3,4] and [5,6,7,8]; 1,5 win groups, 2,6 runners-up
		const groupMatches = [
			// group 1: 1 > 2 > 3 > 4
			match({ groupNo: 1, a: 1, b: 2, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 1, a: 1, b: 3, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 1, a: 1, b: 4, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 1, a: 2, b: 3, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 1, a: 2, b: 4, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 1, a: 3, b: 4, scoreA: 3, scoreB: 0 }),
			// group 2: 5 > 6 > 7 > 8
			match({ groupNo: 2, a: 5, b: 6, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 2, a: 5, b: 7, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 2, a: 5, b: 8, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 2, a: 6, b: 7, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 2, a: 6, b: 8, scoreA: 3, scoreB: 0 }),
			match({ groupNo: 2, a: 7, b: 8, scoreA: 3, scoreB: 0 }),
		];
		const playoff = [
			match({ stage: "semi", groupNo: null, a: 1, b: 6, scoreA: 3, scoreB: 1 }),
			match({ stage: "semi", groupNo: null, a: 5, b: 2, scoreA: 1, scoreB: 3 }),
			match({ stage: "third", groupNo: null, a: 6, b: 5, scoreA: 3, scoreB: 2 }),
			match({ stage: "final", groupNo: null, a: 1, b: 2, scoreA: 3, scoreB: 2 }),
		];
		const all = [...groupMatches, ...playoff];
		const standingsA = computeStandings([1, 2, 3, 4], groupMatches.slice(0, 6));
		const standingsB = computeStandings([5, 6, 7, 8], groupMatches.slice(6));
		const placements = disciplinePlacements(all, [standingsA, standingsB]);
		expect(placements[1]).toBe(1);
		expect(placements[2]).toBe(2);
		expect(placements[6]).toBe(3);
		expect(placements[5]).toBe(4);
		expect(placements[3]).toBe(5);
		expect(placements[7]).toBe(5);
		expect(placements[4]).toBe(7);
		expect(placements[8]).toBe(7);
	});

	it("returns only group-tail placements before the playoff is decided", () => {
		const groupMatches = [
			match({ groupNo: 1, a: 1, b: 2, scoreA: 3, scoreB: 0 }),
		];
		const standings = computeStandings([1, 2], groupMatches);
		const placements = disciplinePlacements(groupMatches, [standings]);
		expect(placements[1]).toBeUndefined();
		expect(placements[2]).toBeUndefined();
	});
});

describe("disciplineStatus", () => {
	it("walks waiting -> group -> playoff -> done", () => {
		expect(disciplineStatus([])).toBe("waiting");
		expect(disciplineStatus([match({ a: 1, b: 2 })])).toBe("group");
		expect(
			disciplineStatus([
				match({ a: 1, b: 2, scoreA: 1, scoreB: 0 }),
				match({ stage: "semi", groupNo: null, a: 1, b: 2 }),
			]),
		).toBe("playoff");
		expect(
			disciplineStatus([
				match({ stage: "final", groupNo: null, a: 1, b: 2, scoreA: 2, scoreB: 1 }),
			]),
		).toBe("done");
	});
});

describe("generalClassification", () => {
	it("awards 10/7/5/4/2/1 and sums across disciplines", () => {
		expect(pointsForPlace(1)).toBe(10);
		expect(pointsForPlace(5)).toBe(2);
		expect(pointsForPlace(7)).toBe(1);
		const rows = generalClassification([1, 2, 3], {
			bilard: { 1: 1, 2: 2, 3: 3 },
			dart: { 1: 2, 2: 1, 3: 3 },
		});
		expect(rows[0].points).toBe(17);
		expect(rows[1].points).toBe(17);
		expect(rows[2].points).toBe(10);
		expect(rows[2].breakdown).toEqual({ bilard: 5, dart: 5 });
	});

	it("breaks point ties by number of discipline wins", () => {
		const rows = generalClassification([1, 2], {
			bilard: { 1: 1, 2: 2 }, // 10 vs 7
			dart: { 1: 4, 2: 3 }, // 4 vs 5 -> 14 vs 12
			pingpong: { 1: 3, 2: 4 }, // 5 vs 4 -> 19 vs 16
		});
		expect(rows[0].playerId).toBe(1);
	});
});
