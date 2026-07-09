"use client";

import PlayerName from "@/components/PlayerName";
import { useTournament } from "@/lib/useTournament";

export default function GeneralPage() {
	const { state, playersById, isLoading } = useTournament();

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const anyPoints = state.general.some((row) => row.points > 0);

	return (
		<main className="flex flex-col gap-5">
			<header>
				<h1 className="text-2xl font-black">🏆 Klasyfikacja generalna</h1>
				<p className="mt-1 text-sm text-white/50">
					1 pkt za każdy wygrany mecz — liczone na żywo, po każdym meczu.
				</p>
			</header>

			{state.players.length === 0 ? (
				<p className="rounded-2xl bg-white/5 px-4 py-10 text-center text-white/40">
					Nikt się jeszcze nie zapisał 🤷
				</p>
			) : (
				<div className="overflow-x-auto rounded-2xl bg-white/5 px-4 py-2">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
								<th className="py-2 pr-2 font-normal">#</th>
								<th className="py-2 font-normal">Gracz</th>
								{state.disciplines.map((d) => (
									<th key={d.slug} className="py-2 text-center font-normal">
										{d.icon}
									</th>
								))}
								<th className="py-2 text-right font-normal">Σ</th>
							</tr>
						</thead>
						<tbody>
							{state.general.map((row, index) => {
								const player = playersById.get(row.playerId);
								return (
									<tr key={row.playerId} className="border-t border-white/5">
										<td className="py-2.5 pr-2 text-white/40">
											{row.points > 0 ? (["🥇", "🥈", "🥉"][index] ?? index + 1) : index + 1}
										</td>
										<td className="py-2.5">
											<PlayerName player={player} bold={index === 0 && anyPoints} />
											{index === 0 && row.points > 0 && " 👑"}
										</td>
										{state.disciplines.map((d) => {
											const plays = player?.disciplineIds.includes(d.id);
											return (
												<td key={d.slug} className="py-2.5 text-center tabular-nums text-white/70">
													{row.breakdown[d.slug] ?? (plays ? "–" : "✕")}
												</td>
											);
										})}
										<td className="py-2.5 text-right font-mono font-bold text-accent">{row.points}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<p className="text-center text-xs text-white/30">
				– gra, brak wygranych · ✕ nie gra w tej dyscyplinie. Wygrywa suma punktów; przy remisie
				liczy się liczba wygranych dyscyplin.
			</p>
		</main>
	);
}
