import type { GroupState, Player } from "@/lib/types";
import PlayerName from "./PlayerName";

export default function GroupTable({
	group,
	playersById,
	advancingCount = 2,
}: {
	group: GroupState;
	playersById: Map<number, Player>;
	advancingCount?: number;
}) {
	return (
		<table className="w-full text-sm">
			<thead>
				<tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
					<th className="py-1 pr-2 font-normal">#</th>
					<th className="py-1 font-normal">Gracz</th>
					<th className="py-1 text-center font-normal">M</th>
					<th className="py-1 text-center font-normal">W</th>
					<th className="py-1 text-center font-normal">P</th>
					<th className="py-1 text-right font-normal">+/−</th>
				</tr>
			</thead>
			<tbody>
				{group.standings.map((row, index) => (
					<tr
						key={row.playerId}
						className={`border-t border-white/5 ${index < advancingCount ? "" : "text-white/60"}`}
					>
						<td className="py-2 pr-2 text-white/40">{index + 1}</td>
						<td className="py-2">
							<PlayerName player={playersById.get(row.playerId)} bold={index < advancingCount} />
							{index < advancingCount && <span className="ml-1.5 text-xs text-accent">▲</span>}
						</td>
						<td className="py-2 text-center tabular-nums">{row.played}</td>
						<td className="py-2 text-center tabular-nums">{row.wins}</td>
						<td className="py-2 text-center tabular-nums">{row.losses}</td>
						<td className="py-2 text-right tabular-nums">
							{row.diff > 0 ? `+${row.diff}` : row.diff}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
