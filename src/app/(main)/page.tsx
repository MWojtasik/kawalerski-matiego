"use client";

import Link from "next/link";
import { useState } from "react";
import JoinQr from "@/components/JoinQr";
import PlayerName from "@/components/PlayerName";
import { api, entrantsFor, myEntrantIds, useMyPlayerId, useTournament } from "@/lib/useTournament";
import type { DisciplineState } from "@/lib/types";

function statusLabel(d: DisciplineState): string {
	if (d.status === "waiting") return "kliknij, żeby wylosować";
	if (d.status === "done") return "zakończony 🏁";
	if (d.status === "playoff") return d.format === "bracket2v2" ? "drabinka 🔥" : "playoff 🔥";
	const played = d.matches.filter((m) => m.winnerId !== null).length;
	return `grupy · ${played}/${d.matches.length} meczów`;
}

export default function Home() {
	const { state, playersById, mutate, isLoading } = useTournament();
	const { myPlayerId, setMyPlayerId } = useMyPlayerId();
	const [name, setName] = useState("");
	const [selectedDisciplines, setSelectedDisciplines] = useState<number[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [joining, setJoining] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [pin, setPin] = useState("");

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const myPlayer = state.players.find((p) => p.id === myPlayerId);
	const drawnIds = new Set(
		state.disciplines.filter((d) => d.status !== "waiting").map((d) => d.id),
	);
	const undrawn = state.disciplines.filter((d) => d.status === "waiting");
	const chosenDisciplines = selectedDisciplines ?? undrawn.map((d) => d.id);
	const disciplineIcon = (id: number) => state.disciplines.find((d) => d.id === id)?.icon;

	const pending = state.disciplines
		.flatMap((d) =>
			d.matches
				.filter((m) => m.winnerId === null)
				.slice(0, 2)
				.map((m) => ({ discipline: d, match: m, entrants: entrantsFor(d, playersById) })),
		)
		.slice(0, 6);
	const top3 = state.general.filter((row) => row.points > 0).slice(0, 3);
	const allDone = state.allDrawn && state.disciplines.every((d) => d.status === "done");

	async function run(action: () => Promise<void>) {
		setError(null);
		try {
			await action();
			await mutate();
		} catch (e) {
			setError((e as Error).message);
			throw e;
		}
	}

	async function join() {
		const trimmed = name.trim();
		if (!trimmed || joining) return;
		setJoining(true);
		try {
			await run(async () => {
				const created = await api<{ id: number }>("/api/players", {
					name: trimmed,
					disciplineIds: chosenDisciplines,
				});
				setMyPlayerId(created.id);
			});
		} catch {
			return;
		} finally {
			setJoining(false);
		}
		setName("");
		setSelectedDisciplines(null);
	}

	function toggleDiscipline(id: number) {
		const current = new Set(chosenDisciplines);
		if (current.has(id)) current.delete(id);
		else current.add(id);
		setSelectedDisciplines([...current]);
	}

	async function toggleMySignup(disciplineId: number) {
		if (!myPlayer) return;
		const next = new Set(myPlayer.disciplineIds);
		if (next.has(disciplineId)) next.delete(disciplineId);
		else next.add(disciplineId);
		await run(() =>
			api(`/api/players/${myPlayer.id}`, { disciplineIds: [...next] }, "PATCH"),
		).catch(() => {});
	}

	async function reset() {
		try {
			await run(() => api("/api/reset", { pin, scope: "all" }));
		} catch {
			return;
		}
		setResetOpen(false);
		setPin("");
	}

	return (
		<main className="flex flex-col gap-8">
			<header className="text-center">
				<h1 className="text-3xl font-black tracking-tight">🍻 Kawalerski Matiego</h1>
				<p className="mt-1 text-sm text-white/50">
					{state.disciplines.map((d) => d.name.toLowerCase()).join(" · ")}
				</p>
			</header>

			{allDone && (
				<Link
					href="/recap"
					className="flex items-center justify-between rounded-3xl bg-accent px-5 py-4 font-bold text-black active:scale-[0.98]"
				>
					<span>🏁 Turniej zakończony — zobacz podsumowanie</span>
					<span>→</span>
				</Link>
			)}

			{!state.allDrawn && (
				<section className="flex flex-col items-center gap-3 rounded-3xl bg-white/5 p-4">
					<JoinQr />
				</section>
			)}

			{!state.allDrawn && !myPlayer && (
				<section className="flex flex-col gap-4 rounded-3xl bg-white/5 p-4">
					<h2 className="text-lg font-bold">🎉 Dołącz do turnieju</h2>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && join()}
						placeholder="Twoja ksywa…"
						maxLength={30}
						className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-accent"
					/>
					<div>
						<p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">W co grasz?</p>
						<div className="flex flex-wrap gap-2">
							{undrawn.map((d) => {
								const on = chosenDisciplines.includes(d.id);
								return (
									<button
										key={d.id}
										type="button"
										onClick={() => toggleDiscipline(d.id)}
										className={`flex-1 rounded-2xl px-2 py-3 text-sm font-semibold ${
											on ? "bg-accent text-black" : "bg-white/5 text-white/40"
										}`}
									>
										{d.icon} {d.name}
									</button>
								);
							})}
						</div>
						{drawnIds.size > 0 && (
							<p className="mt-2 text-xs text-white/40">
								{state.disciplines
									.filter((d) => drawnIds.has(d.id))
									.map((d) => `${d.icon} ${d.name}`)
									.join(", ")}{" "}
								— już wylosowane, zapisy zamknięte.
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={join}
						disabled={!name.trim() || chosenDisciplines.length === 0 || joining}
						className="rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40"
					>
						{joining ? "Zapisuję… ⏳" : "Dołączam 🍻"}
					</button>
					{error && <p className="text-sm text-red-400">{error}</p>}
				</section>
			)}

			{myPlayer && !state.allDrawn && (
				<section className="flex flex-col gap-3 rounded-3xl border border-accent/30 bg-accent/10 px-4 py-4">
					<span className="text-lg font-bold">
						Grasz jako {myPlayer.name}{" "}
						<span className="text-sm font-normal opacity-70">
							{myPlayer.disciplineIds.map(disciplineIcon).join(" ")}
						</span>
					</span>
					{undrawn.length > 0 && (
						<div>
							<p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">
								Twoje zapisy (do losowania można zmieniać)
							</p>
							<div className="flex flex-wrap gap-2">
								{undrawn.map((d) => {
									const on = myPlayer.disciplineIds.includes(d.id);
									return (
										<button
											key={d.id}
											type="button"
											onClick={() => toggleMySignup(d.id)}
											className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
												on ? "bg-accent text-black" : "bg-white/5 text-white/40"
											}`}
										>
											{d.icon} {d.name}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</section>
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
									<PlayerName
										player={playersById.get(row.playerId)}
										bold={index === 0}
										me={row.playerId === myPlayerId}
									/>
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
						const championMe =
							final?.winnerId != null && myEntrantIds(d, myPlayerId).has(final.winnerId);
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
										🏆 <PlayerName player={champion} bold me={championMe} />
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
						{pending.map(({ discipline, match, entrants }) => {
							const meHere = myEntrantIds(discipline, myPlayerId);
							return (
								<Link
									key={match.id}
									href={`/d/${discipline.slug}`}
									className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm active:bg-white/10"
								>
									<span>
										<PlayerName player={entrants.get(match.playerA)} me={meHere.has(match.playerA)} />
										<span className="mx-2 text-white/40">vs</span>
										<PlayerName player={entrants.get(match.playerB)} me={meHere.has(match.playerB)} />
									</span>
									<span className="text-lg">{discipline.icon}</span>
								</Link>
							);
						})}
					</div>
				</section>
			)}

			<section>
				<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">
					Ekipa ({state.players.length})
				</h2>
				<div className="flex flex-col gap-2">
					{state.players.length === 0 && (
						<p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/40">
							Jeszcze nikogo nie ma. Bądź pierwszy 💪
						</p>
					)}
					{state.players.map((player) => {
						const deletable = player.disciplineIds.every((id) => !drawnIds.has(id));
						const me = player.id === myPlayerId;
						return (
							<div
								key={player.id}
								className={`flex items-center justify-between rounded-2xl px-4 py-3 ${me ? "bg-accent/10" : "bg-white/5"}`}
							>
								<PlayerName player={player} me={me} />
								<span className="flex items-center gap-2">
									<span className="text-sm opacity-70">
										{player.disciplineIds.map(disciplineIcon).join(" ")}
									</span>
									{deletable && (
										<button
											type="button"
											onClick={() =>
												run(async () => {
													await api(`/api/players/${player.id}`, undefined, "DELETE");
													if (player.id === myPlayerId) setMyPlayerId(null);
												}).catch(() => {})
											}
											className="rounded-full px-2 text-white/30 active:text-red-400"
											aria-label={`Usuń ${player.name}`}
										>
											✕
										</button>
									)}
								</span>
							</div>
						);
					})}
				</div>
			</section>

			<section className="border-t border-white/10 pt-4">
				{!resetOpen ? (
					<button type="button" onClick={() => setResetOpen(true)} className="text-xs text-white/30">
						Strefa niebezpieczna: reset całego turnieju
					</button>
				) : (
					<div className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
						<p className="text-sm text-red-300">
							Kasuje wszystkie losowania, wyniki i graczy. Pojedynczą dyscyplinę przelosujesz na jej
							stronie.
						</p>
						<input
							value={pin}
							onChange={(e) => setPin(e.target.value)}
							placeholder="PIN"
							className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 outline-none"
						/>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={reset}
								className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-semibold text-red-300"
							>
								Skasuj wszystko (też graczy)
							</button>
							<button
								type="button"
								onClick={() => setResetOpen(false)}
								className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white/50"
							>
								Anuluj
							</button>
						</div>
					</div>
				)}
			</section>
		</main>
	);
}
