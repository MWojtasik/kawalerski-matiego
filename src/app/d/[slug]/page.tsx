"use client";

import { use, useState } from "react";
import Bracket from "@/components/Bracket";
import GroupTable from "@/components/GroupTable";
import MatchCard from "@/components/MatchCard";
import WinnerModal from "@/components/WinnerModal";
import { bracketDrawPreview, groupDrawPreview } from "@/lib/tournament";
import { api, entrantsFor, useTournament } from "@/lib/useTournament";
import type { Match } from "@/lib/types";

const GROUP_LETTERS = ["A", "B", "C", "D"];

function plural(n: number, one: string, few: string, many: string): string {
	if (n === 1) return one;
	if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return few;
	return many;
}
const matchesWord = (n: number) => plural(n, "mecz", "mecze", "meczów");

export default function DisciplinePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = use(params);
	const { state, playersById, mutate, isLoading } = useTournament();
	const [selected, setSelected] = useState<Match | null>(null);
	const [tab, setTab] = useState<number | "playoff">(1);
	const [groupSize, setGroupSize] = useState(4);
	const [drawPin, setDrawPin] = useState("");
	const [drawing, setDrawing] = useState(false);
	const [drawError, setDrawError] = useState<string | null>(null);
	const [resetOpen, setResetOpen] = useState(false);
	const [resetPin, setResetPin] = useState("");

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const discipline = state.disciplines.find((d) => d.slug === slug);
	if (!discipline) {
		return <p className="mt-20 text-center text-white/40">Nie ma takiej dyscypliny 🤷</p>;
	}

	const isBracket = discipline.format === "bracket2v2";
	const eligible = state.players.filter((p) => p.disciplineIds.includes(discipline.id));

	const header = (
		<header className="flex items-center gap-3">
			<span className="text-4xl">{discipline.icon}</span>
			<div>
				<h1 className="text-2xl font-black">{discipline.name}</h1>
				<p className="text-xs text-white/50">
					{discipline.status === "waiting"
						? isBracket
							? "Czeka na losowanie drużyn"
							: "Czeka na losowanie grup"
						: discipline.status === "done"
							? "Turniej zakończony 🏁"
							: discipline.status === "playoff"
								? isBracket
									? "Drabinka 🔥"
									: "Faza playoff 🔥"
								: "Faza grupowa"}
				</p>
			</div>
		</header>
	);

	async function draw() {
		setDrawing(true);
		setDrawError(null);
		try {
			await api("/api/draw", {
				disciplineId: discipline!.id,
				groupSize,
				pin: drawPin,
			});
			await mutate();
		} catch (e) {
			setDrawError((e as Error).message);
		} finally {
			setDrawing(false);
		}
	}

	async function resetDiscipline() {
		try {
			await api("/api/reset", { pin: resetPin, scope: "discipline", disciplineId: discipline!.id });
			await mutate();
		} catch {
			return;
		}
		setResetOpen(false);
		setResetPin("");
	}

	if (discipline.status === "waiting") {
		const ready = eligible.length >= 4;
		let preview: string;
		let warning: string | null = null;
		if (isBracket) {
			const p = bracketDrawPreview(eligible.length);
			preview = ready
				? `${p.teams} ${plural(p.teams, "drużyna", "drużyny", "drużyn")} · drabinka: ${p.matches} ${matchesWord(p.matches)}`
				: "za mało chętnych — potrzeba min. 4";
			if (ready && p.sitOut) {
				warning = "Nieparzysta liczba chętnych — 1 wylosowana osoba pauzuje (bez punktów).";
			}
		} else {
			const p = groupDrawPreview(eligible.length, groupSize);
			preview = ready
				? `${p.groupSizes.length} ${plural(p.groupSizes.length, "grupa", "grupy", "grup")} (${p.groupSizes.join("/")}) · ${p.groupMatches} ${matchesWord(p.groupMatches)} + ${p.playoffMatches} playoff = ${p.total}`
				: "za mało chętnych — potrzeba min. 4";
		}
		return (
			<main className="flex flex-col gap-5">
				{header}
				<section className="flex flex-col gap-3 rounded-3xl border border-accent/20 bg-accent/5 p-4">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">Losowanie</h2>
					<p className="text-sm text-white/60">
						{eligible.length} chętnych
						{eligible.length > 0 && (
							<span className="text-white/40">
								: {eligible.map((p) => p.name).join(", ")}
							</span>
						)}
					</p>
					{!isBracket && (
						<div className="flex items-center gap-2">
							<span className="text-[11px] uppercase tracking-wide text-white/40">Grupy</span>
							{[3, 4, 5].map((size) => (
								<button
									key={size}
									type="button"
									onClick={() => setGroupSize(size)}
									className={`flex-1 rounded-xl py-2 font-bold ${
										groupSize === size ? "bg-accent text-black" : "bg-white/5 text-white/50"
									}`}
								>
									~{size}
								</button>
							))}
						</div>
					)}
					<p className="text-sm text-white/60">{preview}</p>
					{warning && <p className="text-sm text-amber-400">⚠️ {warning}</p>}
					<input
						value={drawPin}
						onChange={(e) => setDrawPin(e.target.value)}
						placeholder="PIN"
						className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-accent"
					/>
					<button
						type="button"
						onClick={draw}
						disabled={drawing || !drawPin || !ready}
						className="rounded-2xl bg-accent py-4 text-lg font-bold text-black disabled:opacity-40"
					>
						{drawing ? "Losuję… 🎲" : isBracket ? "🎲 Losuj drużyny" : "🎲 Losuj grupy"}
					</button>
					{drawError && <p className="text-sm text-red-400">{drawError}</p>}
					<p className="text-xs text-white/40">
						Zapisy prowadzisz na stronie głównej — dopóki tu nie wylosujesz, każdy może dołączyć.
					</p>
				</section>
			</main>
		);
	}

	const entrantsById = entrantsFor(discipline, playersById);
	const dangerZone = (
		<section className="mt-2 border-t border-white/10 pt-4">
			{!resetOpen ? (
				<button type="button" onClick={() => setResetOpen(true)} className="text-xs text-white/30">
					Przelosuj tę dyscyplinę
				</button>
			) : (
				<div className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
					<p className="text-sm text-red-300">
						Kasuje wyniki i losowanie {discipline.name} — trzeba będzie wylosować od nowa. Gracze i
						pozostałe dyscypliny zostają.
					</p>
					<input
						value={resetPin}
						onChange={(e) => setResetPin(e.target.value)}
						placeholder="PIN"
						className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 outline-none"
					/>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={resetDiscipline}
							className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-semibold text-red-300"
						>
							Przelosuj {discipline.name}
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
	);

	if (isBracket) {
		const teamMemberIds = new Set(discipline.teams.flatMap((t) => [t.playerA, t.playerB]));
		const sittingOut = eligible.filter((p) => !teamMemberIds.has(p.id));
		return (
			<main className="flex flex-col gap-5">
				{header}
				<section className="rounded-2xl bg-white/5 px-4 py-3">
					<p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">
						Drużyny ({discipline.teams.length})
					</p>
					<div className="flex flex-col gap-1 text-sm">
						{discipline.teams.map((t) => {
							const entrant = entrantsById.get(t.id);
							return <span key={t.id}>{entrant ? entrant.name : "???"}</span>;
						})}
					</div>
					{sittingOut.length > 0 && (
						<p className="mt-2 text-xs text-white/40">
							Pauzuje: {sittingOut.map((p) => p.name).join(", ")}
						</p>
					)}
				</section>
				<Bracket
					matches={discipline.matches}
					groups={discipline.groups}
					entrantsById={entrantsById}
					onSelect={setSelected}
					format={discipline.format}
				/>
				{dangerZone}
				{selected && (
					<WinnerModal
						match={selected}
						entrantsById={entrantsById}
						onClose={() => setSelected(null)}
						onSaved={() => mutate()}
					/>
				)}
			</main>
		);
	}

	const groupMatches = (no: number) =>
		discipline.matches.filter((m) => m.stage === "group" && m.groupNo === no);
	const playoffStarted = discipline.matches.some((m) => m.stage !== "group");
	const activeGroup = discipline.groups.find((g) => g.no === tab);
	const groupCount = discipline.groups.length;
	const advancingCount = groupCount === 1 ? 4 : groupCount === 2 ? 2 : 1;
	const advancingNote =
		groupCount === 3 ? "z drugich miejsc awansuje najlepszy (wygrane, potem mniej meczów)" : undefined;

	return (
		<main className="flex flex-col gap-5">
			{header}

			<div className="flex gap-2">
				{discipline.groups.map((g) => (
					<button
						key={g.no}
						type="button"
						onClick={() => setTab(g.no)}
						className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold ${
							tab === g.no ? "bg-accent text-black" : "bg-white/5 text-white/60"
						}`}
					>
						Grupa {GROUP_LETTERS[g.no - 1] ?? g.no}
					</button>
				))}
				<button
					type="button"
					onClick={() => setTab("playoff")}
					className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold ${
						tab === "playoff" ? "bg-accent text-black" : "bg-white/5 text-white/60"
					}`}
				>
					Playoff {playoffStarted ? "🔥" : "🔒"}
				</button>
			</div>

			{tab !== "playoff" && activeGroup && (
				<>
					<section className="rounded-2xl bg-white/5 px-4 py-3">
						<GroupTable
							group={activeGroup}
							entrantsById={entrantsById}
							advancingCount={advancingCount}
							advancingNote={advancingNote}
						/>
					</section>
					<section className="flex flex-col gap-2">
						{groupMatches(activeGroup.no).map((m) => (
							<MatchCard
								key={m.id}
								match={m}
								entrantsById={entrantsById}
								subtitle={m.round ? `Runda ${m.round}` : undefined}
								onClick={() => setSelected(m)}
							/>
						))}
					</section>
				</>
			)}

			{tab === "playoff" && (
				<Bracket
					matches={discipline.matches}
					groups={discipline.groups}
					entrantsById={entrantsById}
					onSelect={setSelected}
				/>
			)}

			{dangerZone}

			{selected && (
				<WinnerModal
					match={selected}
					entrantsById={entrantsById}
					onClose={() => setSelected(null)}
					onSaved={() => mutate()}
				/>
			)}
		</main>
	);
}
