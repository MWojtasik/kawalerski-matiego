"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PlayerName from "@/components/PlayerName";
import { api, useTournament } from "@/lib/useTournament";

const EMOJI_POOL = ["🍺", "😎", "🦁", "🐗", "🦈", "🤠", "🥷", "🧨", "🍕", "🦍", "🐺", "🔥", "⚡", "🎸", "🚀", "🃏"];

export default function SetupPage() {
	const router = useRouter();
	const { state, playersById, mutate, isLoading } = useTournament();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [drawing, setDrawing] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [pin, setPin] = useState("");

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	async function run(action: () => Promise<void>) {
		setError(null);
		try {
			await action();
			await mutate();
		} catch (e) {
			setError((e as Error).message);
		}
	}

	async function addPlayer() {
		const trimmed = name.trim();
		if (!trimmed) return;
		const emoji = EMOJI_POOL[(state?.players.length ?? 0) % EMOJI_POOL.length];
		await run(() => api("/api/players", { name: trimmed, emoji }));
		setName("");
	}

	async function draw() {
		setDrawing(true);
		try {
			await run(() => api("/api/draw"));
			router.push("/");
		} finally {
			setDrawing(false);
		}
	}

	async function reset(scope: "draw" | "all") {
		await run(() => api("/api/reset", { pin, scope }));
		setResetOpen(false);
		setPin("");
	}

	return (
		<main className="flex flex-col gap-6">
			<header>
				<h1 className="text-2xl font-black">⚙️ Setup turnieju</h1>
				<p className="mt-1 text-sm text-white/50">
					{state.lockedSetup
						? "Grupy wylosowane — skład zamrożony."
						: "Dodaj ekipę, potem losuj grupy."}
				</p>
			</header>

			{!state.lockedSetup && (
				<div className="flex gap-2">
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && addPlayer()}
						placeholder="Ksywa gracza…"
						maxLength={30}
						className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-accent"
					/>
					<button
						type="button"
						onClick={addPlayer}
						disabled={!name.trim()}
						className="rounded-2xl bg-accent px-5 font-bold text-black disabled:opacity-40"
					>
						Dodaj
					</button>
				</div>
			)}

			{error && <p className="text-sm text-red-400">{error}</p>}

			<section className="flex flex-col gap-2">
				{state.players.length === 0 && (
					<p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/40">
						Jeszcze nikogo nie ma. Dodaj pierwszego śmiałka 💪
					</p>
				)}
				{state.players.map((player, index) => (
					<div
						key={player.id}
						className="pop-in flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
						style={{ animationDelay: `${index * 0.03}s` }}
					>
						<PlayerName player={playersById.get(player.id)} />
						{!state.lockedSetup && (
							<button
								type="button"
								onClick={() => run(() => api(`/api/players/${player.id}`, undefined, "DELETE"))}
								className="rounded-full px-2 text-white/30 active:text-red-400"
								aria-label={`Usuń ${player.name}`}
							>
								✕
							</button>
						)}
					</div>
				))}
			</section>

			{!state.lockedSetup && (
				<button
					type="button"
					onClick={draw}
					disabled={state.players.length < 4 || drawing}
					className="rounded-3xl bg-accent px-6 py-5 text-lg font-bold text-black disabled:opacity-40"
				>
					{drawing
						? "Losuję… 🎲"
						: state.players.length < 4
							? `🎲 Losuj grupy (min. 4 graczy, jest ${state.players.length})`
							: `🎲 Losuj grupy dla ${state.players.length} graczy!`}
				</button>
			)}

			<section className="mt-6 border-t border-white/10 pt-4">
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
							inputMode="numeric"
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
