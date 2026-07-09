export type Stage = "group" | "semi" | "third" | "final";

export interface Player {
	id: number;
	name: string;
	emoji: string;
	/** disciplines the player signed up for */
	disciplineIds: number[];
}

export interface Discipline {
	id: number;
	slug: string;
	name: string;
	icon: string;
}

export interface Match {
	id: number;
	disciplineId: number;
	stage: Stage;
	groupNo: number | null;
	round: number | null;
	playerA: number;
	playerB: number;
	winnerId: number | null;
}

export interface StandingRow {
	playerId: number;
	played: number;
	wins: number;
	losses: number;
}

export interface GroupState {
	no: number;
	memberIds: number[];
	standings: StandingRow[];
	complete: boolean;
}

export type DisciplineStatus = "waiting" | "group" | "playoff" | "done";

export interface DisciplineState extends Discipline {
	status: DisciplineStatus;
	groups: GroupState[];
	matches: Match[];
	/** playerId -> final placement (1-based), only when the final is decided */
	placements: Record<number, number>;
}

export interface GeneralRow {
	playerId: number;
	points: number;
	/** discipline slug -> points earned there (absent if discipline unfinished) */
	breakdown: Record<string, number>;
}

export interface TournamentState {
	players: Player[];
	lockedSetup: boolean;
	disciplines: DisciplineState[];
	general: GeneralRow[];
}
