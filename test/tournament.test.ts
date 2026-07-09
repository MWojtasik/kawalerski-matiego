import { describe, expect, it } from "vitest";
import {
	computeStandings,
	disciplinePlacements,
	disciplineStatus,
	generalClassification,
	numGroupsFor,
	pointsForPlace,
	roundRobinRounds,
	seedPlayoff,
	shuffle,
	splitIntoGroups,
	stageComplete,
} from "../src/lib/tournament";
import type { Match, Stage, StandingRow } from "../src/lib/types";

let nextId = 1;
function match(partial: {
	stage?: Stage;
	groupNo?: number | null;
	winner: number;
	loser: number;
}): Match {
	const { stage = "group", groupNo = 1, winner, loser } = partial;
	return {
		id: nextId++,
		disciplineId: 1,
		stage,
		groupNo,
		round: null,
		playerA: winner,
		playerB: loser,
		winnerId: winner,
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

	it("skips disciplines a player did not enter", () => {
		const rows = generalClassification([1, 2], { bilard: { 1: 1 } });
		expect(rows.find((r) => r.playerId === 2)?.points).toBe(0);
	});

	it("breaks point ties by number of discipline wins", () => {
		const rows = generalClassification([1, 2], {
			bilard: { 1: 1, 2: 2 },
			dart: { 1: 4, 2: 3 },
			pingpong: { 1: 3, 2: 4 },
		});
		expect(rows[0].playerId).toBe(1);
	});
});
