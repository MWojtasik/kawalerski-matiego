"use client";

import type { Match, Player } from "@/lib/types";
import PlayerName from "./PlayerName";

export default function MatchCard({
	match,
	playersById,
	onClick,
	subtitle,
}: {
	match: Match;
	playersById: Map<number, Player>;
	onClick?: () => void;
	subtitle?: string;
}) {
	const played = match.winnerId !== null;
	const winnerA = match.winnerId === match.playerA;
	const winnerB = match.winnerId === match.playerB;
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded-2xl bg-white/5 px-4 py-3 text-left active:bg-white/10"
		>
			{subtitle && <div className="mb-1 text-[11px] uppercase tracking-wide text-white/40">{subtitle}</div>}
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<span className={winnerA ? "" : played ? "text-white/50" : ""}>
						<PlayerName player={playersById.get(match.playerA)} bold={winnerA} />
					</span>
					<span className={winnerB ? "" : played ? "text-white/50" : ""}>
						<PlayerName player={playersById.get(match.playerB)} bold={winnerB} />
					</span>
				</div>
				{played ? (
					<div className="flex flex-col items-end gap-1 font-mono text-lg font-bold tabular-nums">
						<span className={winnerA ? "text-accent" : "text-white/50"}>{match.scoreA}</span>
						<span className={winnerB ? "text-accent" : "text-white/50"}>{match.scoreB}</span>
					</div>
				) : (
					<span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
						wpisz wynik
					</span>
				)}
			</div>
		</button>
	);
}
