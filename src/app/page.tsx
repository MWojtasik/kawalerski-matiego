"use client";

import Link from "next/link";
import PlayerName from "@/components/PlayerName";
import { useTournament } from "@/lib/useTournament";
import type { DisciplineState } from "@/lib/types";

function statusLabel(d: DisciplineState): string {
	if (d.status === "waiting") return "czeka na losowanie";
	if (d.status === "done") return "zakończony 🏁";
	const played = d.matches.filter((m) => m.winnerId !== null).length;
	return d.status === "group"
		? `grupy · ${played}/${d.matches.length} meczów`
		: "playoff 🔥";
}

export default function Home() {
	const { state, playersById, isLoading } = useTournament();

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const pending = state.disciplines
		.flatMap((d) =>
			d.matches
				.filter((m) => m.winnerId === null)
				.slice(0, 2)
				.map((m) => ({ discipline: d, match: m })),
		)
		.slice(0, 6);
	const top3 = state.general.filter((row) => row.points > 0).slice(0, 3);

	return (
		<main className="flex flex-col gap-8">
			<header className="text-center">
				<h1 className="text-3xl font-black tracking-tight">🍻 Kawalerski Matiego</h1>
				<p className="mt-1 text-sm text-white/50">bilard · dart · ping-pong</p>
			</header>

			{!state.lockedSetup && (
				<Link
					href="/setup"
					className="rounded-3xl bg-accent px-6 py-5 text-center text-lg font-bold text-black active:scale-[0.98]"
				>
					{state.players.length < 4
						? "⚙️ Dodaj graczy i wylosuj grupy"
						: `🎲 ${state.players.length} graczy — losuj grupy!`}
				</Link>
			)}

			{top3.length > 0 && (
				<section>
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
						Klasyfikacja generalna
					</h2>
					<div className="flex flex-col gap-2">
						{top3.map((row, index) => (
							<div
								key={row.playerId}
								className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
							>
								<span>
									{["🥇", "🥈", "🥉"][index]}{" "}
									<PlayerName player={playersById.get(row.playerId)} bold={index === 0} />
									{index === 0 && " 👑"}
								</span>
								<span className="font-mono font-bold text-accent">{row.points} pkt</span>
							</div>
						))}
					</div>
					<Link href="/general" className="mt-2 block text-right text-sm text-accent">
						pełny ranking →
					</Link>
				</section>
			)}

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
					Dyscypliny
				</h2>
				<div className="flex flex-col gap-2">
					{state.disciplines.map((d) => {
						const champion =
							d.status === "done"
								? Object.entries(d.placements).find(([, place]) => place === 1)?.[0]
								: undefined;
						return (
							<Link
								key={d.slug}
								href={`/d/${d.slug}`}
								className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4 active:bg-white/10"
							>
								<span className="flex items-center gap-3">
									<span className="text-2xl">{d.icon}</span>
									<span>
										<span className="block font-semibold">{d.name}</span>
										<span className="block text-xs text-white/50">{statusLabel(d)}</span>
									</span>
								</span>
								{champion ? (
									<span className="text-sm">
										🏆 <PlayerName player={playersById.get(Number(champion))} bold />
									</span>
								) : (
									<span className="text-white/30">→</span>
								)}
							</Link>
						);
					})}
				</div>
			</section>

			{pending.length > 0 && (
				<section>
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
						Do rozegrania
					</h2>
					<div className="flex flex-col gap-2">
						{pending.map(({ discipline, match }) => (
							<Link
								key={match.id}
								href={`/d/${discipline.slug}`}
								className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm active:bg-white/10"
							>
								<span>
									<PlayerName player={playersById.get(match.playerA)} />
									<span className="mx-2 text-white/40">vs</span>
									<PlayerName player={playersById.get(match.playerB)} />
								</span>
								<span className="text-lg">{discipline.icon}</span>
							</Link>
						))}
					</div>
				</section>
			)}

			{state.lockedSetup && (
				<Link href="/setup" className="text-center text-xs text-white/30">
					ustawienia turnieju
				</Link>
			)}
		</main>
	);
}
