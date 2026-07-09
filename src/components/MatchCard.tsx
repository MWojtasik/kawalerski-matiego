"use client";

import type { Entrant, Match } from "@/lib/types";
import PlayerName from "./PlayerName";

export default function MatchCard({
	match,
	entrantsById,
	onClick,
	subtitle,
}: {
	match: Match;
	entrantsById: Map<number, Entrant>;
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
					<span className={played && !winnerA ? "text-white/50 line-through decoration-white/30" : ""}>
						<PlayerName player={entrantsById.get(match.playerA)} bold={winnerA} />
						{winnerA && <span className="ml-1.5">✅</span>}
					</span>
					<span className={played && !winnerB ? "text-white/50 line-through decoration-white/30" : ""}>
						<PlayerName player={entrantsById.get(match.playerB)} bold={winnerB} />
						{winnerB && <span className="ml-1.5">✅</span>}
					</span>
				</div>
				{!played && (
					<span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
						kto wygrał?
					</span>
				)}
			</div>
		</button>
	);
}
