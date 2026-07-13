export type Stage = "group" | "quarter" | "semi" | "third" | "final";

export type DisciplineFormat = "groups" | "bracket2v2";

export interface Player {
	id: number;
	name: string;
	/** disciplines the player signed up for */
	disciplineIds: number[];
}

export interface Discipline {
	id: number;
	slug: string;
	name: string;
	icon: string;
	format: DisciplineFormat;
}

/** 2-player team drawn for a bracket2v2 discipline */
export interface Team {
	id: number;
	disciplineId: number;
	playerA: number;
	playerB: number;
}

/** What a match slot points at: a player, or a team in bracket disciplines. */
export interface Entrant {
	id: number;
	name: string;
}

export interface Match {
	id: number;
	disciplineId: number;
	stage: Stage;
	groupNo: number | null;
	round: number | null;
	/** entrant id: player id for "groups" disciplines, team id for "bracket2v2" */
	playerA: number;
	playerB: number;
	winnerId: number | null;
	/** ISO timestamp when the result was entered; null while unplayed */
	decidedAt: string | null;
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
	teams: Team[];
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
	/** every discipline has been drawn — signups fully closed */
	allDrawn: boolean;
	/** organizer ended the tournament early — results frozen, recap unlocked */
	finished: boolean;
	disciplines: DisciplineState[];
	general: GeneralRow[];
}
