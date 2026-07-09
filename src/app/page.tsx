"use client";

import Link from "next/link";
import PlayerName from "@/components/PlayerName";
import { entrantsFor, useMyPlayerId, useTournament } from "@/lib/useTournament";
import type { DisciplineState } from "@/lib/types";

function statusLabel(d: DisciplineState): string {
	if (d.status === "waiting") return "czeka na losowanie";
	if (d.status === "done") return "zakończony 🏁";
	if (d.status === "playoff") return d.format === "bracket2v2" ? "drabinka 🔥" : "playoff 🔥";
	const played = d.matches.filter((m) => m.winnerId !== null).length;
	return `grupy · ${played}/${d.matches.length} meczów`;
}

export default function Home() {
	const { state, playersById, isLoading } = useTournament();
	const { myPlayerId } = useMyPlayerId();

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}
	const myPlayer = state.players.find((p) => p.id === myPlayerId);

	const pending = state.disciplines
		.flatMap((d) =>
			d.matches
				.filter((m) => m.winnerId === null)
				.slice(0, 2)
				.map((m) => ({ discipline: d, match: m, entrants: entrantsFor(d, playersById) })),
		)
		.slice(0, 6);
	const top3 = state.general.filter((row) => row.points > 0).slice(0, 3);

	return (
		<main className="flex flex-col gap-8">
			<header className="text-center">
				<h1 className="text-3xl font-black tracking-tight">🍻 Kawalerski Matiego</h1>
				<p className="mt-1 text-sm text-white/50">
					{state.disciplines.map((d) => d.name.toLowerCase()).join(" · ")}
				</p>
			</header>

			{!state.allDrawn &&
				(myPlayer ? (
					<Link
						href="/setup"
						className="rounded-3xl border border-accent/30 bg-accent/10 px-6 py-4 text-center font-semibold active:scale-[0.98]"
					>
						✅ Grasz jako {myPlayer.emoji} {myPlayer.name} — zapisy wciąż otwarte
					</Link>
				) : (
					<Link
						href="/setup"
						className="rounded-3xl bg-accent px-6 py-5 text-center text-lg font-bold text-black active:scale-[0.98]"
					>
						{state.players.length < 4
							? "🎉 Zapisz się na turniej!"
							: `🎉 Zapisz się! (jest już ${state.players.length} graczy)`}
					</Link>
				))}

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
						const final = d.matches.find((m) => m.stage === "final");
						const champion =
							final?.winnerId != null ? entrantsFor(d, playersById).get(final.winnerId) : undefined;
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
										🏆 <PlayerName player={champion} bold />
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
						{pending.map(({ discipline, match, entrants }) => (
							<Link
								key={match.id}
								href={`/d/${discipline.slug}`}
								className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm active:bg-white/10"
							>
								<span>
									<PlayerName player={entrants.get(match.playerA)} />
									<span className="mx-2 text-white/40">vs</span>
									<PlayerName player={entrants.get(match.playerB)} />
								</span>
								<span className="text-lg">{discipline.icon}</span>
							</Link>
						))}
					</div>
				</section>
			)}

			{state.allDrawn && (
				<Link href="/setup" className="text-center text-xs text-white/30">
					ustawienia turnieju
				</Link>
			)}
		</main>
	);
}
