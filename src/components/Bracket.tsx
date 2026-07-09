"use client";

import type { Match, Player } from "@/lib/types";
import MatchCard from "./MatchCard";

export default function Bracket({
	matches,
	playersById,
	onSelect,
}: {
	matches: Match[];
	playersById: Map<number, Player>;
	onSelect: (match: Match) => void;
}) {
	const semis = matches.filter((m) => m.stage === "semi");
	const final = matches.find((m) => m.stage === "final");
	const third = matches.find((m) => m.stage === "third");

	if (semis.length === 0) {
		return (
			<p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/50">
				Playoff wystartuje, gdy wszystkie mecze grupowe będą rozegrane.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h4 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Półfinały</h4>
				<div className="flex flex-col gap-2">
					{semis.map((m, i) => (
						<MatchCard
							key={m.id}
							match={m}
							playersById={playersById}
							subtitle={`Półfinał ${i + 1}`}
							onClick={() => onSelect(m)}
						/>
					))}
				</div>
			</div>
			{final && (
				<div>
					<h4 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Finał 🏆</h4>
					<MatchCard match={final} playersById={playersById} onClick={() => onSelect(final)} />
				</div>
			)}
			{third && (
				<div>
					<h4 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Mecz o 3. miejsce</h4>
					<MatchCard match={third} playersById={playersById} onClick={() => onSelect(third)} />
				</div>
			)}
		</div>
	);
}
