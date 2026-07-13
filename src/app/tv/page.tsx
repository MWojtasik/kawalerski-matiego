"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Bracket from "@/components/Bracket";
import GroupTable from "@/components/GroupTable";
import JoinQr from "@/components/JoinQr";
import { fireConfetti } from "@/lib/confetti";
import { recentResults, upcomingMatches } from "@/lib/tournament";
import { entrantsFor, useTournament } from "@/lib/useTournament";
import type { DisciplineState, Entrant, Match, Player, TournamentState } from "@/lib/types";

const GROUP_LETTERS = ["A", "B", "C", "D"];
const SCENE_MS = 12000;

const STAGE_LABELS: Partial<Record<Match["stage"], string>> = {
	quarter: "ćwierćfinał",
	semi: "półfinał",
	third: "o 3. msc",
	final: "FINAŁ",
};

function matchLabel(match: Match): string {
	if (match.stage === "group") {
		return match.groupNo != null ? `gr. ${GROUP_LETTERS[match.groupNo - 1] ?? match.groupNo}` : "";
	}
	return STAGE_LABELS[match.stage] ?? "";
}

function useClock(): string | null {
	const [now, setNow] = useState<string | null>(null);
	useEffect(() => {
		const tick = () =>
			setNow(new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, []);
	return now;
}

export default function TvPage() {
	const { state, playersById, isLoading } = useTournament();
	const clock = useClock();
	const [scene, setScene] = useState(0);

	// Resolve entrant names once per discipline (players, or team combos for 2v2).
	const entrantsByDiscipline = useMemo(() => {
		const map = new Map<number, Map<number, Entrant>>();
		for (const d of state?.disciplines ?? []) map.set(d.id, entrantsFor(d, playersById));
		return map;
	}, [state, playersById]);

	// Right column rotates through drawn disciplines; lobby while nothing is drawn.
	const scenes = useMemo(() => {
		const drawn = (state?.disciplines ?? []).filter((d) => d.status !== "waiting");
		if (drawn.length === 0) return ["lobby" as const];
		return drawn.map((d) => ({ disciplineId: d.id }));
	}, [state]);

	// Rotate scenes on a timer; keep the index in range as scenes appear/vanish.
	useEffect(() => {
		const id = window.setInterval(() => setScene((s) => s + 1), SCENE_MS);
		return () => window.clearInterval(id);
	}, []);
	const current = scenes[scene % scenes.length];

	// Celebrate whenever a new discipline champion is crowned.
	const knownChampions = useRef<Set<number> | null>(null);
	useEffect(() => {
		if (!state) return;
		const champs = new Set<number>();
		for (const d of state.disciplines) {
			const final = d.matches.find((m) => m.stage === "final");
			if (final?.winnerId != null) champs.add(d.id);
		}
		if (knownChampions.current === null) {
			knownChampions.current = champs; // first load — don't fire retroactively
			return;
		}
		for (const id of champs) {
			if (!knownChampions.current.has(id)) {
				fireConfetti({ big: true });
				break;
			}
		}
		knownChampions.current = champs;
	}, [state]);

	if (isLoading || !state) {
		return (
			<div className="flex min-h-dvh items-center justify-center text-2xl text-white/40">
				Ładowanie…
			</div>
		);
	}

	const feed = recentResults(state, 6);
	// Once the organizer ends the tournament the remaining matches won't happen.
	const upNext = state.finished ? [] : upcomingMatches(state, 4);
	const nameOf = (disciplineId: number, entrantId: number) =>
		entrantsByDiscipline.get(disciplineId)?.get(entrantId)?.name ?? "???";

	return (
		<div className="flex min-h-dvh flex-col gap-6 p-8">
			<header className="flex items-center justify-between gap-6">
				<div>
					<h1 className="text-5xl font-black tracking-tight">🍻 Kawalerski Matiego</h1>
					<p className="mt-1 text-lg text-white/40">
						{state.disciplines.map((d) => `${d.icon} ${d.name}`).join("   ·   ")}
					</p>
				</div>
				<div className="flex items-center gap-6">
					<span className="font-mono text-4xl tabular-nums text-white/70">{clock ?? "--:--"}</span>
					<JoinQr size={120} caption={null} />
				</div>
			</header>

			<main className="grid min-h-0 flex-1 grid-cols-[2fr_3fr] gap-10">
				<section className="flex min-h-0 flex-col gap-4">
					<h2 className="text-2xl font-bold text-white/80">🏆 Klasyfikacja generalna</h2>
					<GeneralTable state={state} playersById={playersById} />
				</section>
				<section key={scene} className="pop-in min-h-0">
					{current === "lobby" ? (
						<LobbyScene players={state.players} />
					) : (
						<DisciplineScene
							discipline={state.disciplines.find((d) => d.id === current.disciplineId)!}
							entrantsById={entrantsByDiscipline.get(current.disciplineId) ?? new Map()}
						/>
					)}
				</section>
			</main>

			<footer className="flex min-h-[4.5rem] flex-col gap-3 border-t border-white/10 pt-4">
				{upNext.length === 0 && feed.length === 0 ? (
					<p className="text-center text-lg text-white/30">Wyniki pojawią się tutaj na żywo…</p>
				) : (
					<>
						{upNext.length > 0 && (
							<div className="flex items-center gap-4 overflow-hidden">
								<span className="shrink-0 text-sm font-semibold uppercase tracking-wide text-accent/80">
									▶ Kto gra?
								</span>
								<div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
									{upNext.map((u) => (
										<span
											key={u.match.id}
											className="shrink-0 rounded-full bg-accent/10 px-4 py-2 text-lg ring-1 ring-accent/20"
										>
											<span className="mr-1">{u.icon}</span>
											<span className="mr-1.5 text-sm text-white/40">{matchLabel(u.match)}</span>
											<span className="font-semibold">{nameOf(u.disciplineId, u.match.playerA)}</span>
											<span className="mx-1.5 text-white/40">vs</span>
											<span className="font-semibold">{nameOf(u.disciplineId, u.match.playerB)}</span>
										</span>
									))}
								</div>
							</div>
						)}
						{feed.length > 0 && (
							<div className="flex items-center gap-4 overflow-hidden">
								<span className="shrink-0 text-sm font-semibold uppercase tracking-wide text-white/40">
									Ostatnie wyniki
								</span>
								<div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
									{feed.map((r, i) => (
										<span
											key={`${r.disciplineId}-${i}`}
											className="shrink-0 rounded-full bg-white/5 px-4 py-2 text-lg"
										>
											<span className="mr-1">{r.icon}</span>
											<span className="font-semibold text-accent">{nameOf(r.disciplineId, r.winnerId)}</span>
											<span className="mx-1.5 text-white/40">ograł</span>
											<span className="text-white/60">{nameOf(r.disciplineId, r.loserId)}</span>
										</span>
									))}
								</div>
							</div>
						)}
					</>
				)}
			</footer>
		</div>
	);
}

/** The same table as /general, sized up a notch for the big screen. */
function GeneralTable({
	state,
	playersById,
}: {
	state: TournamentState;
	playersById: Map<number, Player>;
}) {
	const anyPoints = state.general.some((row) => row.points > 0);

	if (state.players.length === 0) {
		return (
			<p className="rounded-2xl bg-white/5 px-6 py-12 text-center text-xl text-white/40">
				Nikt się jeszcze nie zapisał 🤷
			</p>
		);
	}

	return (
		<div className="min-h-0 overflow-y-auto rounded-2xl bg-white/5 px-6 py-3">
			<table className="w-full text-xl">
				<thead>
					<tr className="text-left text-sm uppercase tracking-wide text-white/40">
						<th className="py-3 pr-3 font-normal">#</th>
						<th className="py-3 font-normal">Gracz</th>
						{state.disciplines.map((d) => (
							<th key={d.slug} className="py-3 text-center font-normal">
								{d.icon}
							</th>
						))}
						<th className="py-3 text-right font-normal">Σ</th>
					</tr>
				</thead>
				<tbody>
					{state.general.map((row, index) => {
						const player = playersById.get(row.playerId);
						return (
							<tr key={row.playerId} className="border-t border-white/5">
								<td className="py-3.5 pr-3 text-white/40">
									{row.points > 0 ? (["🥇", "🥈", "🥉"][index] ?? index + 1) : index + 1}
								</td>
								<td className={`py-3.5 ${index === 0 && anyPoints ? "font-semibold" : ""}`}>
									{player?.name ?? "???"}
									{index === 0 && row.points > 0 && " 👑"}
								</td>
								{state.disciplines.map((d) => {
									const plays = player?.disciplineIds.includes(d.id);
									return (
										<td key={d.slug} className="py-3.5 text-center tabular-nums text-white/70">
											{row.breakdown[d.slug] ?? (plays ? "–" : "✕")}
										</td>
									);
								})}
								<td className="py-3.5 text-right font-mono font-bold text-accent">{row.points}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function LobbyScene({ players }: { players: Player[] }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-8 text-center">
			<h2 className="text-4xl font-bold">Wbijajcie do gry! 🎉</h2>
			<div className="scale-125">
				<JoinQr size={200} caption="📱 Zeskanuj telefonem i dołącz" />
			</div>
			<p className="text-2xl text-white/60">
				Zapisanych: <span className="font-bold text-accent">{players.length}</span> — czekamy aż
				organizator wylosuje grupy.
			</p>
		</div>
	);
}

function DisciplineScene({
	discipline,
	entrantsById,
}: {
	discipline: DisciplineState;
	entrantsById: Map<number, Entrant>;
}) {
	const final = discipline.matches.find((m) => m.stage === "final");
	const champion = final?.winnerId != null ? entrantsById.get(final.winnerId) : undefined;
	const playoffStarted = discipline.matches.some((m) => m.stage !== "group");
	const isBracket = discipline.format === "bracket2v2";
	const advancingCount =
		discipline.groups.length === 1 ? 4 : discipline.groups.length === 2 ? 2 : 1;

	return (
		<div className="flex h-full flex-col gap-6">
			<div className="flex items-center gap-4">
				<span className="text-6xl">{discipline.icon}</span>
				<div>
					<h2 className="text-4xl font-black">{discipline.name}</h2>
					<p className="text-lg text-white/50">
						{discipline.status === "done"
							? "Zakończone 🏁"
							: isBracket
								? "Drabinka 🔥"
								: playoffStarted
									? "Playoff 🔥"
									: "Faza grupowa"}
					</p>
				</div>
			</div>

			{champion && (
				<div className="rounded-3xl bg-accent px-8 py-5 text-center text-4xl font-black text-black">
					🏆 Mistrz: {champion.name}
				</div>
			)}

			{/* Shared components (Bracket/GroupTable) have fixed mobile-sized text — zoom them up for the TV. */}
			<div className="min-h-0 flex-1 overflow-hidden [zoom:1.35]">
				{isBracket || playoffStarted ? (
					<Bracket
						matches={discipline.matches}
						groups={discipline.groups}
						entrantsById={entrantsById}
						onSelect={() => {}}
						format={discipline.format}
					/>
				) : (
					<div className="grid grid-cols-2 gap-x-6 gap-y-4">
						{discipline.groups.map((g) => (
							<div key={g.no} className="rounded-2xl bg-white/5 px-4 py-3">
								<p className="mb-2 text-sm font-semibold text-white/50">
									Grupa {GROUP_LETTERS[g.no - 1] ?? g.no}
								</p>
								<GroupTable
									group={g}
									entrantsById={entrantsById}
									advancingCount={advancingCount}
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
