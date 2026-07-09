import type { Entrant, GroupState } from "@/lib/types";
import PlayerName from "./PlayerName";

export default function GroupTable({
	group,
	entrantsById,
	advancingCount,
	advancingNote,
	meIds,
}: {
	group: GroupState;
	entrantsById: Map<number, Entrant>;
	/** how many top spots surely advance (▲ marker) */
	advancingCount: number;
	/** extra note under the table, e.g. best-runner-up rule */
	advancingNote?: string;
	/** entrant ids to highlight as the current device's player */
	meIds?: Set<number>;
}) {
	return (
		<div>
			<table className="w-full text-sm">
				<thead>
					<tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
						<th className="py-1 pr-2 font-normal">#</th>
						<th className="py-1 font-normal">Gracz</th>
						<th className="py-1 text-center font-normal">M</th>
						<th className="py-1 text-center font-normal">W</th>
						<th className="py-1 text-center font-normal">P</th>
					</tr>
				</thead>
				<tbody>
					{group.standings.map((row, index) => {
						const me = !!meIds?.has(row.playerId);
						return (
						<tr
							key={row.playerId}
							className={`border-t border-white/5 ${index < advancingCount ? "" : "text-white/60"} ${me ? "bg-accent/10" : ""}`}
						>
							<td className="py-2 pr-2 text-white/40">{index + 1}</td>
							<td className="py-2">
								<PlayerName
									player={entrantsById.get(row.playerId)}
									bold={index < advancingCount}
									me={me}
								/>
								{index < advancingCount && <span className="ml-1.5 text-xs text-accent">▲</span>}
							</td>
							<td className="py-2 text-center tabular-nums">{row.played}</td>
							<td className="py-2 text-center tabular-nums">{row.wins}</td>
							<td className="py-2 text-center tabular-nums">{row.losses}</td>
						</tr>
						);
					})}
				</tbody>
			</table>
			<p className="mt-2 text-[11px] text-white/35">
				M — mecze rozegrane · W — wygrane · P — porażki · ▲ awans do playoffu
				{advancingNote ? ` · ${advancingNote}` : ""}
			</p>
		</div>
	);
}
