"use client";

import { useState } from "react";
import { api, useMyPlayerId, useTournament } from "@/lib/useTournament";
import { bracketDrawPreview, groupDrawPreview } from "@/lib/tournament";
import type { DisciplineState } from "@/lib/types";

const EMOJI_POOL = ["🍺", "😎", "🦁", "🐗", "🦈", "🤠", "🥷", "🧨", "🍕", "🦍", "🐺", "🔥", "⚡", "🎸", "🚀", "🃏"];

function plural(n: number, one: string, few: string, many: string): string {
	if (n === 1) return one;
	if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return few;
	return many;
}

const matchesWord = (n: number) => plural(n, "mecz", "mecze", "meczów");

export default function SetupPage() {
	const { state, mutate, isLoading } = useTournament();
	const { myPlayerId, setMyPlayerId } = useMyPlayerId();
	const [name, setName] = useState("");
	const [emoji, setEmoji] = useState<string | null>(null);
	const [selectedDisciplines, setSelectedDisciplines] = useState<number[] | null>(null);
	const [groupSizes, setGroupSizes] = useState<Record<number, number>>({});
	const [error, setError] = useState<string | null>(null);
	const [joining, setJoining] = useState(false);
	const [drawingId, setDrawingId] = useState<number | null>(null);
	const [drawPin, setDrawPin] = useState("");
	const [resetOpen, setResetOpen] = useState(false);
	const [pin, setPin] = useState("");

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const drawnIds = new Set(
		state.disciplines.filter((d) => d.status !== "waiting").map((d) => d.id),
	);
	const undrawn = state.disciplines.filter((d) => d.status === "waiting");
	const undrawnIds = undrawn.map((d) => d.id);
	const chosenDisciplines = selectedDisciplines ?? undrawnIds;
	const chosenEmoji = emoji ?? EMOJI_POOL[state.players.length % EMOJI_POOL.length];
	const disciplineIcon = (id: number) => state.disciplines.find((d) => d.id === id)?.icon;
	const myPlayer = state.players.find((p) => p.id === myPlayerId);

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
					emoji: chosenEmoji,
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
		setEmoji(null);
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

	async function draw(discipline: DisciplineState) {
		setDrawingId(discipline.id);
		try {
			await run(() =>
				api("/api/draw", {
					disciplineId: discipline.id,
					groupSize: groupSizes[discipline.id] ?? 4,
					pin: drawPin,
				}),
			);
		} catch {
			// error already shown
		} finally {
			setDrawingId(null);
		}
	}

	async function reset(scope: "draw" | "all") {
		try {
			await run(() => api("/api/reset", { pin, scope }));
		} catch {
			return;
		}
		setResetOpen(false);
		setPin("");
	}

	const eligibleCount = (disciplineId: number) =>
		state.players.filter((p) => p.disciplineIds.includes(disciplineId)).length;

	function drawCard(d: DisciplineState) {
		const eligible = eligibleCount(d.id);
		const ready = eligible >= 4;
		let preview: string;
		let warning: string | null = null;
		if (d.format === "bracket2v2") {
			const p = bracketDrawPreview(eligible);
			preview = ready
				? `${p.teams} ${plural(p.teams, "drużyna", "drużyny", "drużyn")} · drabinka: ${p.matches} ${matchesWord(p.matches)}`
				: "za mało chętnych";
			if (ready && p.sitOut) {
				warning = "Nieparzysta liczba chętnych — 1 wylosowana osoba pauzuje (bez punktów).";
			}
		} else {
			const size = groupSizes[d.id] ?? 4;
			const p = groupDrawPreview(eligible, size);
			preview = ready
				? `${p.groupSizes.length} ${plural(p.groupSizes.length, "grupa", "grupy", "grup")} (${p.groupSizes.join("/")}) · ${p.groupMatches} ${matchesWord(p.groupMatches)} + ${p.playoffMatches} playoff = ${p.total}`
				: "za mało chętnych";
		}
		return (
			<div key={d.id} className="flex flex-col gap-2 rounded-2xl bg-white/5 p-3">
				<div className="flex items-center justify-between">
					<span className="font-semibold">
						{d.icon} {d.name}
					</span>
					<span className="text-xs text-white/50">
						{eligible} chętnych{!ready && " — min. 4"}
					</span>
				</div>
				{d.format !== "bracket2v2" && (
					<div className="flex items-center gap-2">
						<span className="text-[11px] uppercase tracking-wide text-white/40">Grupy</span>
						{[3, 4, 5].map((size) => (
							<button
								key={size}
								type="button"
								onClick={() => setGroupSizes({ ...groupSizes, [d.id]: size })}
								className={`flex-1 rounded-xl py-1.5 text-sm font-bold ${
									(groupSizes[d.id] ?? 4) === size
										? "bg-accent text-black"
										: "bg-white/5 text-white/50"
								}`}
							>
								~{size}
							</button>
						))}
					</div>
				)}
				<p className="text-xs text-white/50">{preview}</p>
				{warning && <p className="text-xs text-amber-400">⚠️ {warning}</p>}
				<button
					type="button"
					onClick={() => draw(d)}
					disabled={drawingId !== null || !drawPin || !ready}
					className="rounded-xl bg-accent py-2.5 font-bold text-black disabled:opacity-40"
				>
					{drawingId === d.id ? "Losuję… 🎲" : d.format === "bracket2v2" ? "🎲 Losuj drużyny" : "🎲 Losuj grupy"}
				</button>
			</div>
		);
	}

	return (
		<main className="flex flex-col gap-6">
			<header>
				<h1 className="text-2xl font-black">
					{state.allDrawn ? "⚙️ Turniej trwa" : myPlayer ? "✅ Jesteś w grze" : "🎉 Dołącz do turnieju"}
				</h1>
				<p className="mt-1 text-sm text-white/50">
					{state.allDrawn
						? "Wszystko wylosowane — zapisy zamknięte."
						: myPlayer
							? "Czekamy na resztę ekipy i losowania."
							: "Wpisz ksywę, wybierz avatar i zaznacz, w co grasz."}
				</p>
			</header>

			{myPlayer && (
				<section className="flex flex-col gap-3 rounded-3xl border border-accent/30 bg-accent/10 px-4 py-4">
					<span className="text-lg font-bold">
						{myPlayer.emoji} Grasz jako {myPlayer.name}{" "}
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

			{!state.allDrawn && !myPlayer && (
				<section className="flex flex-col gap-4 rounded-3xl bg-white/5 p-4">
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && join()}
						placeholder="Twoja ksywa…"
						maxLength={30}
						className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-accent"
					/>
					<div>
						<p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Avatar</p>
						<div className="grid grid-cols-8 gap-1.5">
							{EMOJI_POOL.map((e) => (
								<button
									key={e}
									type="button"
									onClick={() => setEmoji(e)}
									className={`rounded-xl py-1.5 text-xl ${
										chosenEmoji === e ? "bg-accent/30 ring-2 ring-accent" : "bg-white/5"
									}`}
								>
									{e}
								</button>
							))}
						</div>
					</div>
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
				</section>
			)}

			{error && <p className="text-sm text-red-400">{error}</p>}

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
					{state.players.map((player, index) => {
						const deletable = player.disciplineIds.every((id) => !drawnIds.has(id));
						return (
							<div
								key={player.id}
								className="pop-in flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
								style={{ animationDelay: `${index * 0.03}s` }}
							>
								<span>
									<span className="mr-1">{player.emoji}</span>
									{player.name}
								</span>
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

			{!state.allDrawn && (
				<section className="flex flex-col gap-3 rounded-3xl border border-accent/20 bg-accent/5 p-4">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">
						Losowanie
					</h2>
					<input
						value={drawPin}
						onChange={(e) => setDrawPin(e.target.value)}
						placeholder="PIN"
						className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-accent"
					/>
					{undrawn.map(drawCard)}
					{state.disciplines
						.filter((d) => drawnIds.has(d.id))
						.map((d) => (
							<p key={d.id} className="rounded-2xl bg-white/5 px-3 py-2.5 text-sm text-white/50">
								✅ {d.icon} {d.name} — wylosowane
							</p>
						))}
				</section>
			)}

			<section className="mt-4 border-t border-white/10 pt-4">
				{!resetOpen ? (
					<button
						type="button"
						onClick={() => setResetOpen(true)}
						className="text-xs text-white/30"
					>
						Strefa niebezpieczna: reset turnieju
					</button>
				) : (
					<div className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
						<p className="text-sm text-red-300">Reset kasuje wyniki i losowania.</p>
						<input
							value={pin}
							onChange={(e) => setPin(e.target.value)}
							placeholder="PIN"
							className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 outline-none"
						/>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => reset("draw")}
								className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-semibold text-red-300"
							>
								Skasuj wyniki i losowania
							</button>
							<button
								type="button"
								onClick={() => reset("all")}
								className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-semibold text-red-300"
							>
								Skasuj wszystko (też graczy)
							</button>
						</div>
						<button
							type="button"
							onClick={() => setResetOpen(false)}
							className="text-xs text-white/40"
						>
							Anuluj
						</button>
					</div>
				)}
			</section>
		</main>
	);
}
