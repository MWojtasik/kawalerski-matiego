"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useTournament } from "@/lib/useTournament";

const EMOJI_POOL = ["🍺", "😎", "🦁", "🐗", "🦈", "🤠", "🥷", "🧨", "🍕", "🦍", "🐺", "🔥", "⚡", "🎸", "🚀", "🃏"];

export default function SetupPage() {
	const router = useRouter();
	const { state, mutate, isLoading } = useTournament();
	const [name, setName] = useState("");
	const [emoji, setEmoji] = useState<string | null>(null);
	const [selectedDisciplines, setSelectedDisciplines] = useState<number[] | null>(null);
	const [groupSize, setGroupSize] = useState(4);
	const [error, setError] = useState<string | null>(null);
	const [drawing, setDrawing] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [pin, setPin] = useState("");

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const allDisciplineIds = state.disciplines.map((d) => d.id);
	const chosenDisciplines = selectedDisciplines ?? allDisciplineIds;
	const chosenEmoji = emoji ?? EMOJI_POOL[state.players.length % EMOJI_POOL.length];
	const disciplineIcon = (id: number) => state.disciplines.find((d) => d.id === id)?.icon;

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
		if (!trimmed) return;
		try {
			await run(() =>
				api("/api/players", { name: trimmed, emoji: chosenEmoji, disciplineIds: chosenDisciplines }),
			);
		} catch {
			return;
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

	async function draw() {
		setDrawing(true);
		try {
			await run(() => api("/api/draw", { groupSize }));
			router.push("/");
		} catch {
			// error already shown
		} finally {
			setDrawing(false);
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

	return (
		<main className="flex flex-col gap-6">
			<header>
				<h1 className="text-2xl font-black">
					{state.lockedSetup ? "⚙️ Turniej trwa" : "🎉 Dołącz do turnieju"}
				</h1>
				<p className="mt-1 text-sm text-white/50">
					{state.lockedSetup
						? "Grupy wylosowane — zapisy zamknięte."
						: "Wpisz ksywę, wybierz avatar i zaznacz, w co grasz."}
				</p>
			</header>

			{!state.lockedSetup && (
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
						<div className="flex gap-2">
							{state.disciplines.map((d) => {
								const on = chosenDisciplines.includes(d.id);
								return (
									<button
										key={d.id}
										type="button"
										onClick={() => toggleDiscipline(d.id)}
										className={`flex-1 rounded-2xl py-3 text-sm font-semibold ${
											on ? "bg-accent text-black" : "bg-white/5 text-white/40"
										}`}
									>
										{d.icon} {d.name}
									</button>
								);
							})}
						</div>
					</div>
					<button
						type="button"
						onClick={join}
						disabled={!name.trim() || chosenDisciplines.length === 0}
						className="rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40"
					>
						Dołączam 🍻
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
					{state.players.map((player, index) => (
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
								{!state.lockedSetup && (
									<button
										type="button"
										onClick={() =>
											run(() => api(`/api/players/${player.id}`, undefined, "DELETE")).catch(() => {})
										}
										className="rounded-full px-2 text-white/30 active:text-red-400"
										aria-label={`Usuń ${player.name}`}
									>
										✕
									</button>
								)}
							</span>
						</div>
					))}
				</div>
			</section>

			{!state.lockedSetup && (
				<section className="flex flex-col gap-3 rounded-3xl border border-accent/20 bg-accent/5 p-4">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">
						Losowanie (dla organizatora)
					</h2>
					<div>
						<p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">
							Docelowa wielkość grupy
						</p>
						<div className="flex gap-2">
							{[3, 4, 5].map((size) => (
								<button
									key={size}
									type="button"
									onClick={() => setGroupSize(size)}
									className={`flex-1 rounded-2xl py-2.5 font-bold ${
										groupSize === size ? "bg-accent text-black" : "bg-white/5 text-white/50"
									}`}
								>
									~{size}
								</button>
							))}
						</div>
					</div>
					<div className="text-xs text-white/50">
						{state.disciplines.map((d) => (
							<p key={d.id}>
								{d.icon} {d.name}: {eligibleCount(d.id)} chętnych
								{eligibleCount(d.id) < 4 && " — za mało (min. 4), zostanie pominięta"}
							</p>
						))}
					</div>
					<button
						type="button"
						onClick={draw}
						disabled={drawing || state.players.length < 4}
						className="rounded-2xl bg-accent py-4 text-lg font-bold text-black disabled:opacity-40"
					>
						{drawing ? "Losuję… 🎲" : "🎲 Losuj grupy i zaczynamy!"}
					</button>
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
						<p className="text-sm text-red-300">
							Reset kasuje wyniki i losowanie. PIN zna organizator 😉
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
								onClick={() => reset("draw")}
								className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-semibold text-red-300"
							>
								Skasuj wyniki i losowanie
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
