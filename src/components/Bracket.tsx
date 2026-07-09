"use client";

import type { DisciplineFormat, Entrant, GroupState, Match } from "@/lib/types";

const GROUP_LETTERS = ["A", "B", "C", "D"];

function slotLabels(groupCount: number, hasQuarters: boolean): [string, string][] {
	if (groupCount === 0) {
		// bracket discipline — semis are seeded from the draw or the quarters
		const slot = hasQuarters ? "Po ćwierćfinałach" : "Drużyna";
		return [
			[slot, slot],
			[slot, slot],
		];
	}
	if (groupCount === 1) {
		return [
			["1. z grupy", "4. z grupy"],
			["2. z grupy", "3. z grupy"],
		];
	}
	if (groupCount === 2) {
		return [
			["1. grupy A", "2. grupy B"],
			["1. grupy B", "2. grupy A"],
		];
	}
	if (groupCount === 3) {
		return [
			["Zwycięzca grupy", "Zwycięzca / najl. 2."],
			["Zwycięzca grupy", "Najlepszy z 2. miejsc"],
		];
	}
	return [
		["Zwycięzca grupy", "Zwycięzca grupy"],
		["Zwycięzca grupy", "Zwycięzca grupy"],
	];
}

function Slot({
	player,
	placeholder,
	winner,
	loser,
}: {
	player: Entrant | undefined;
	placeholder: string;
	winner?: boolean;
	loser?: boolean;
}) {
	if (!player) {
		return (
			<div className="truncate rounded-lg border border-dashed border-white/15 px-2.5 py-2 text-xs text-white/30">
				{placeholder}
			</div>
		);
	}
	return (
		<div
			className={`truncate rounded-lg px-2.5 py-2 text-sm ${
				winner
					? "bg-accent/20 font-bold text-accent"
					: loser
						? "bg-white/5 text-white/40 line-through decoration-white/30"
						: "bg-white/10"
			}`}
		>
			{player.emoji} {player.name}
		</div>
	);
}

function MatchBox({
	match,
	labels,
	entrantsById,
	onSelect,
	title,
}: {
	match: Match | undefined;
	labels: [string, string];
	entrantsById: Map<number, Entrant>;
	onSelect: (match: Match) => void;
	title: string;
}) {
	const body = (
		<div className="flex flex-col gap-1.5">
			<div className="text-[10px] uppercase tracking-wide text-white/40">{title}</div>
			<Slot
				player={match ? entrantsById.get(match.playerA) : undefined}
				placeholder={labels[0]}
				winner={match?.winnerId === match?.playerA && match?.winnerId != null}
				loser={match?.winnerId != null && match?.winnerId !== match?.playerA}
			/>
			<Slot
				player={match ? entrantsById.get(match.playerB) : undefined}
				placeholder={labels[1]}
				winner={match?.winnerId === match?.playerB && match?.winnerId != null}
				loser={match?.winnerId != null && match?.winnerId !== match?.playerB}
			/>
		</div>
	);
	if (!match) return <div className="rounded-2xl bg-white/[0.03] p-2.5">{body}</div>;
	return (
		<button
			type="button"
			onClick={() => onSelect(match)}
			className="w-full rounded-2xl bg-white/5 p-2.5 text-left active:bg-white/10"
		>
			{body}
		</button>
	);
}

export default function Bracket({
	matches,
	groups,
	entrantsById,
	onSelect,
	format = "groups",
}: {
	matches: Match[];
	groups: GroupState[];
	entrantsById: Map<number, Entrant>;
	onSelect: (match: Match) => void;
	format?: DisciplineFormat;
}) {
	const quarters = matches.filter((m) => m.stage === "quarter");
	const semis = matches.filter((m) => m.stage === "semi");
	const final = matches.find((m) => m.stage === "final");
	const third = matches.find((m) => m.stage === "third");
	const isBracket = format === "bracket2v2";
	const labels = slotLabels(isBracket ? 0 : groups.length, quarters.length > 0);
	const champion = final?.winnerId != null ? entrantsById.get(final.winnerId) : undefined;
	const byes =
		quarters.length > 0
			? [...entrantsById.values()].filter(
					(e) => !quarters.some((m) => m.playerA === e.id || m.playerB === e.id),
				)
			: [];
	// T=2: straight final; T=3: one semi and the double-bye team waits in the final
	const finalOnly = isBracket && semis.length === 0 && quarters.length === 0;
	const singleSemi = isBracket && semis.length === 1;
	const showThird = !isBracket || third !== undefined || semis.length === 2;

	return (
		<div className="flex flex-col gap-6">
			{!isBracket && semis.length === 0 && (
				<p className="text-center text-xs text-white/40">
					Drabinka zapełni się po rozegraniu wszystkich meczów grupowych
					{groups.length > 1 &&
						` (grupy ${groups.map((g) => GROUP_LETTERS[g.no - 1] ?? g.no).join(", ")})`}
					.
				</p>
			)}
			{quarters.length > 0 && (
				<div className="flex flex-col gap-2">
					{quarters.map((m, index) => (
						<MatchBox
							key={m.id}
							match={m}
							labels={labels[0]}
							entrantsById={entrantsById}
							onSelect={onSelect}
							title={`Ćwierćfinał ${index + 1}`}
						/>
					))}
					{byes.length > 0 && (
						<p className="text-xs text-white/40">
							Wolny los do półfinału: {byes.map((e) => `${e.emoji} ${e.name}`).join(", ")}
						</p>
					)}
				</div>
			)}
			{finalOnly ? (
				<div className="flex flex-col gap-3">
					<MatchBox
						match={final}
						labels={["Drużyna", "Drużyna"]}
						entrantsById={entrantsById}
						onSelect={onSelect}
						title="Finał 🏆"
					/>
					{champion && (
						<div className="rounded-2xl bg-accent px-3 py-2.5 text-center text-sm font-black text-black">
							🏆 {champion.emoji} {champion.name}
						</div>
					)}
				</div>
			) : (
				<div className="grid grid-cols-[1fr_20px_1fr] items-stretch">
					<div className="flex flex-col justify-around gap-4">
						<MatchBox
							match={semis[0]}
							labels={labels[0]}
							entrantsById={entrantsById}
							onSelect={onSelect}
							title="Półfinał 1"
						/>
						{!singleSemi && (
							<MatchBox
								match={semis[1]}
								labels={labels[1]}
								entrantsById={entrantsById}
								onSelect={onSelect}
								title="Półfinał 2"
							/>
						)}
					</div>
					{/* bracket connectors */}
					<div className="relative">
						{singleSemi ? (
							<div className="absolute right-0 top-1/2 h-0 w-full border-t-2 border-white/15" />
						) : (
							<>
								<div className="absolute left-1 top-[22%] h-[56%] w-[10px] rounded-r-md border-y-2 border-r-2 border-white/15" />
								<div className="absolute right-0 top-1/2 h-0 w-[9px] border-t-2 border-white/15" />
							</>
						)}
					</div>
					<div className="flex flex-col justify-center gap-3">
						<MatchBox
							match={final}
							labels={singleSemi ? ["Wolny los", "Zwycięzca PF"] : ["Zwycięzca PF1", "Zwycięzca PF2"]}
							entrantsById={entrantsById}
							onSelect={onSelect}
							title="Finał 🏆"
						/>
						{champion && (
							<div className="rounded-2xl bg-accent px-3 py-2.5 text-center text-sm font-black text-black">
								🏆 {champion.emoji} {champion.name}
							</div>
						)}
					</div>
				</div>
			)}
			{showThird && (
				<div className="mx-auto w-full max-w-[calc(50%+10px)] sm:max-w-[280px]">
					<MatchBox
						match={third}
						labels={["Przegrany PF1", "Przegrany PF2"]}
						entrantsById={entrantsById}
						onSelect={onSelect}
						title="Mecz o 3. miejsce 🥉"
					/>
				</div>
			)}
		</div>
	);
}
