"use client";

import PlayerName from "@/components/PlayerName";
import { useTournament } from "@/lib/useTournament";

export default function GeneralPage() {
	const { state, playersById, isLoading } = useTournament();

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const finished = state.disciplines.filter((d) => Object.keys(d.placements).length > 0);
	const anyPoints = state.general.some((row) => row.points > 0);

	return (
		<main className="flex flex-col gap-5">
			<header>
				<h1 className="text-2xl font-black">🏆 Klasyfikacja generalna</h1>
				<p className="mt-1 text-sm text-white/50">
					{finished.length === 0
						? "Punkty pojawią się po pierwszym rozstrzygniętym finale."
						: `Punktacja miejsc: 10 · 7 · 5 · 4 · 2 · 1 — liczy się ${finished.length}/${state.disciplines.length} dyscyplin.`}
				</p>
			</header>

			{!anyPoints ? (
				<p className="rounded-2xl bg-white/5 px-4 py-10 text-center text-white/40">
					Jeszcze nikt nic nie ugrał 🤐
				</p>
			) : (
				<div className="overflow-x-auto rounded-2xl bg-white/5 px-4 py-2">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
								<th className="py-2 pr-2 font-normal">#</th>
								<th className="py-2 font-normal">Gracz</th>
								{finished.map((d) => (
									<th key={d.slug} className="py-2 text-center font-normal">
										{d.icon}
									</th>
								))}
								<th className="py-2 text-right font-normal">Σ</th>
							</tr>
						</thead>
						<tbody>
							{state.general.map((row, index) => (
								<tr key={row.playerId} className="border-t border-white/5">
									<td className="py-2.5 pr-2 text-white/40">
										{["🥇", "🥈", "🥉"][index] ?? index + 1}
									</td>
									<td className="py-2.5">
										<PlayerName player={playersById.get(row.playerId)} bold={index === 0} />
										{index === 0 && row.points > 0 && " 👑"}
									</td>
									{finished.map((d) => (
										<td key={d.slug} className="py-2.5 text-center tabular-nums text-white/70">
											{row.breakdown[d.slug] ?? "–"}
										</td>
									))}
									<td className="py-2.5 text-right font-mono font-bold text-accent">{row.points}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<p className="text-center text-xs text-white/30">
				Wygrywa ten, kto zbierze najwięcej punktów ze wszystkich dyscyplin. Remis? Liczy się liczba
				wygranych dyscyplin.
			</p>
		</main>
	);
}
