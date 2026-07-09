"use client";

import type { GroupState, Match, Player } from "@/lib/types";

const GROUP_LETTERS = ["A", "B", "C", "D"];

function slotLabels(groupCount: number): [string, string][] {
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
	player: Player | undefined;
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
	playersById,
	onSelect,
	title,
}: {
	match: Match | undefined;
	labels: [string, string];
	playersById: Map<number, Player>;
	onSelect: (match: Match) => void;
	title: string;
}) {
	const body = (
		<div className="flex flex-col gap-1.5">
			<div className="text-[10px] uppercase tracking-wide text-white/40">{title}</div>
			<Slot
				player={match ? playersById.get(match.playerA) : undefined}
				placeholder={labels[0]}
				winner={match?.winnerId === match?.playerA && match?.winnerId != null}
				loser={match?.winnerId != null && match?.winnerId !== match?.playerA}
			/>
			<Slot
				player={match ? playersById.get(match.playerB) : undefined}
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
	playersById,
	onSelect,
}: {
	matches: Match[];
	groups: GroupState[];
	playersById: Map<number, Player>;
	onSelect: (match: Match) => void;
}) {
	const semis = matches.filter((m) => m.stage === "semi");
	const final = matches.find((m) => m.stage === "final");
	const third = matches.find((m) => m.stage === "third");
	const labels = slotLabels(groups.length);
	const champion = final?.winnerId != null ? playersById.get(final.winnerId) : undefined;

	return (
		<div className="flex flex-col gap-6">
			{semis.length === 0 && (
				<p className="text-center text-xs text-white/40">
					Drabinka zapełni się po rozegraniu wszystkich meczów grupowych
					{groups.length > 1 &&
						` (grupy ${groups.map((g) => GROUP_LETTERS[g.no - 1] ?? g.no).join(", ")})`}
					.
				</p>
			)}
			<div className="grid grid-cols-[1fr_20px_1fr] items-stretch">
				<div className="flex flex-col justify-around gap-4">
					<MatchBox
						match={semis[0]}
						labels={labels[0]}
						playersById={playersById}
						onSelect={onSelect}
						title="Półfinał 1"
					/>
					<MatchBox
						match={semis[1]}
						labels={labels[1]}
						playersById={playersById}
						onSelect={onSelect}
						title="Półfinał 2"
					/>
				</div>
				{/* bracket connectors */}
				<div className="relative">
					<div className="absolute left-1 top-[22%] h-[56%] w-[10px] rounded-r-md border-y-2 border-r-2 border-white/15" />
					<div className="absolute right-0 top-1/2 h-0 w-[9px] border-t-2 border-white/15" />
				</div>
				<div className="flex flex-col justify-center gap-3">
					<MatchBox
						match={final}
						labels={["Zwycięzca PF1", "Zwycięzca PF2"]}
						playersById={playersById}
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
			<div className="mx-auto w-full max-w-[calc(50%+10px)] sm:max-w-[280px]">
				<MatchBox
					match={third}
					labels={["Przegrany PF1", "Przegrany PF2"]}
					playersById={playersById}
					onSelect={onSelect}
					title="Mecz o 3. miejsce 🥉"
				/>
			</div>
		</div>
	);
}
