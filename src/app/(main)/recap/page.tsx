"use client";

import { useEffect, useRef, useState } from "react";
import PlayerName from "@/components/PlayerName";
import { fireConfetti } from "@/lib/confetti";
import { recapStats } from "@/lib/tournament";
import { useMyPlayerId, useTournament } from "@/lib/useTournament";

export default function RecapPage() {
	const { state, playersById, isLoading } = useTournament();
	const { myPlayerId } = useMyPlayerId();
	const [copied, setCopied] = useState(false);
	const celebrated = useRef(false);

	const done =
		!!state && state.allDrawn && state.disciplines.every((d) => d.status === "done");

	// One celebratory burst when the recap first opens on a finished tournament.
	useEffect(() => {
		if (done && !celebrated.current) {
			celebrated.current = true;
			fireConfetti({ big: true });
		}
	}, [done]);

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const nameOf = (id: number) => playersById.get(id)?.name ?? "???";

	if (!done) {
		const total = state.disciplines.length;
		const finished = state.disciplines.filter((d) => d.status === "done").length;
		return (
			<main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
				<span className="text-6xl">🎬</span>
				<h1 className="text-2xl font-black">Podsumowanie czeka…</h1>
				<p className="text-white/50">
					Turniej jeszcze trwa — rozstrzygnięte {finished} z {total} dyscyplin. Wróć, gdy poznamy
					wszystkich mistrzów!
				</p>
			</main>
		);
	}

	const stats = recapStats(state);

	async function share() {
		const url = window.location.href;
		const champ = stats.championId != null ? nameOf(stats.championId) : "";
		const text = champ
			? `🏆 Mistrz Kawalerskiego Matiego: ${champ}! Zobacz pełne wyniki:`
			: "🏆 Wyniki Kawalerskiego Matiego:";
		if (typeof navigator !== "undefined" && navigator.share) {
			try {
				await navigator.share({ title: "Kawalerski Matiego 🍻", text, url });
			} catch {
				// user dismissed the share sheet — nothing to do
			}
			return;
		}
		try {
			await navigator.clipboard?.writeText(`${text} ${url}`);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2500);
		} catch {
			// clipboard blocked — ignore
		}
	}

	const medals = ["🥇", "🥈", "🥉"];

	return (
		<main className="flex flex-col gap-8 py-4">
			<header className="text-center">
				<p className="text-sm uppercase tracking-widest text-white/40">Kawalerski Matiego</p>
				<h1 className="mt-1 text-4xl font-black">To jest koniec! 🏁</h1>
			</header>

			{stats.championId != null && (
				<section className="flex flex-col items-center gap-2 rounded-3xl bg-accent/10 py-8 ring-1 ring-accent/30">
					<span className="text-6xl">👑</span>
					<p className="text-sm uppercase tracking-wide text-white/50">Mistrz Kawalerskiego</p>
					<p className="text-3xl font-black text-accent">{nameOf(stats.championId)}</p>
				</section>
			)}

			{stats.table.length > 0 && (
				<section>
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
						Klasyfikacja końcowa
					</h2>
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
									<th className="py-2 text-right font-normal">W-L</th>
									<th className="py-2 pl-2 text-right font-normal">Σ</th>
								</tr>
							</thead>
							<tbody>
								{stats.table.map((row, index) => {
									const player = playersById.get(row.playerId);
									const me = row.playerId === myPlayerId;
									return (
										<tr
											key={row.playerId}
											className={`border-t border-white/5 ${me ? "bg-accent/10" : ""}`}
										>
											<td className="py-2.5 pr-2 text-white/40">
												{row.points > 0 ? (medals[index] ?? index + 1) : index + 1}
											</td>
											<td className="py-2.5">
												<PlayerName player={player} bold={index === 0} me={me} />
												{index === 0 && row.points > 0 && " 👑"}
											</td>
											{state.disciplines.map((d) => {
												const place = row.placements[d.slug];
												const plays = player?.disciplineIds.includes(d.id);
												return (
													<td key={d.slug} className="py-2.5 text-center tabular-nums text-white/70">
														{place !== undefined
															? (medals[place - 1] ?? `${place}.`)
															: plays
																? "–"
																: "✕"}
													</td>
												);
											})}
											<td className="py-2.5 text-right tabular-nums text-white/70">
												{row.wins}-{row.losses}
											</td>
											<td className="py-2.5 pl-2 text-right font-mono font-bold text-accent">
												{row.points}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<p className="mt-2 text-center text-xs text-white/30">
						Miejsce w dyscyplinie · W-L = wygrane-przegrane · Σ = punkty generalki · ✕ nie grał
					</p>
				</section>
			)}

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
					Mistrzowie dyscyplin
				</h2>
				<div className="flex flex-col gap-2">
					{stats.disciplineChampions.map((c) => (
						<div
							key={c.disciplineId}
							className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
						>
							<span className="flex items-center gap-2">
								<span className="text-2xl">{c.icon}</span>
								<span className="text-white/60">{c.name}</span>
							</span>
							<span className="text-right font-semibold">
								🏆{" "}
								{c.playerIds.map((id, i) => (
									<span key={id}>
										{i > 0 && <span className="text-white/40"> + </span>}
										<PlayerName player={playersById.get(id)} me={id === myPlayerId} />
									</span>
								))}
							</span>
						</div>
					))}
				</div>
			</section>

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
					Złote (i mniej złote) medale imprezy
				</h2>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{stats.unbeatenIds.length > 0 && (
						<Award icon="💪" title="Niepokonani">
							{stats.unbeatenIds.map((id, i) => (
								<span key={id}>
									{i > 0 && ", "}
									<PlayerName player={playersById.get(id)} me={id === myPlayerId} />
								</span>
							))}
						</Award>
					)}
					{stats.longestStreak && (
						<Award icon="⚡" title="Seria zwycięstw">
							<PlayerName
								player={playersById.get(stats.longestStreak.playerId)}
								me={stats.longestStreak.playerId === myPlayerId}
							/>{" "}
							<span className="text-white/40">· {stats.longestStreak.length} z rzędu</span>
						</Award>
					)}
					{stats.mostActive && (
						<Award icon="🔥" title="Największy młyn">
							<PlayerName
								player={playersById.get(stats.mostActive.playerId)}
								me={stats.mostActive.playerId === myPlayerId}
							/>{" "}
							<span className="text-white/40">· {stats.mostActive.played} meczów</span>
						</Award>
					)}
					{stats.unlucky && (
						<Award icon="🃏" title="Pechowiec wieczoru">
							<PlayerName
								player={playersById.get(stats.unlucky.playerId)}
								me={stats.unlucky.playerId === myPlayerId}
							/>{" "}
							<span className="text-white/40">
								· najwięcej porażek: {stats.unlucky.losses}
							</span>
						</Award>
					)}
					<Award icon="📊" title="Liczby">
						<span className="text-white/70">
							{stats.totalPlayers} zawodników · {stats.decidedMatches} rozegranych meczów
						</span>
					</Award>
				</div>
			</section>

			<button
				type="button"
				onClick={share}
				className="rounded-2xl bg-accent py-4 text-lg font-bold text-black active:scale-[0.98]"
			>
				{copied ? "Skopiowano link ✅" : "📣 Podziel się wynikami"}
			</button>
		</main>
	);
}

function Award({
	icon,
	title,
	children,
}: {
	icon: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl bg-white/5 px-4 py-3">
			<p className="text-[11px] uppercase tracking-wide text-white/40">
				{icon} {title}
			</p>
			<p className="mt-0.5">{children}</p>
		</div>
	);
}
