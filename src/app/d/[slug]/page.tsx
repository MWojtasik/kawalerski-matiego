"use client";

import Link from "next/link";
import { use, useState } from "react";
import Bracket from "@/components/Bracket";
import GroupTable from "@/components/GroupTable";
import MatchCard from "@/components/MatchCard";
import WinnerModal from "@/components/WinnerModal";
import { entrantsFor, useTournament } from "@/lib/useTournament";
import type { Match } from "@/lib/types";

const GROUP_LETTERS = ["A", "B", "C", "D"];

export default function DisciplinePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = use(params);
	const { state, playersById, mutate, isLoading } = useTournament();
	const [selected, setSelected] = useState<Match | null>(null);
	const [tab, setTab] = useState<number | "playoff">(1);

	if (isLoading || !state) {
		return <p className="mt-20 text-center text-white/40">Ładowanie…</p>;
	}

	const discipline = state.disciplines.find((d) => d.slug === slug);
	if (!discipline) {
		return <p className="mt-20 text-center text-white/40">Nie ma takiej dyscypliny 🤷</p>;
	}

	const isBracket = discipline.format === "bracket2v2";

	if (discipline.status === "waiting") {
		return (
			<main className="flex flex-col items-center gap-4 pt-20 text-center">
				<span className="text-5xl">{discipline.icon}</span>
				<h1 className="text-2xl font-black">{discipline.name}</h1>
				<p className="text-white/50">
					{isBracket ? "Najpierw wylosuj drużyny w setupie." : "Najpierw wylosuj grupy w setupie."}
				</p>
				<Link href="/setup" className="rounded-2xl bg-accent px-6 py-3 font-bold text-black">
					⚙️ Idź do setupu
				</Link>
			</main>
		);
	}

	const entrantsById = entrantsFor(discipline, playersById);
	const groupMatches = (no: number) =>
		discipline.matches.filter((m) => m.stage === "group" && m.groupNo === no);
	const playoffStarted = discipline.matches.some((m) => m.stage !== "group");
	const activeGroup = discipline.groups.find((g) => g.no === tab);
	const groupCount = discipline.groups.length;
	const advancingCount = groupCount === 1 ? 4 : groupCount === 2 ? 2 : 1;
	const advancingNote =
		groupCount === 3 ? "z drugich miejsc awansuje najlepszy (wygrane, potem mniej meczów)" : undefined;
	const teamMemberIds = new Set(discipline.teams.flatMap((t) => [t.playerA, t.playerB]));
	const sittingOut = state.players.filter(
		(p) => p.disciplineIds.includes(discipline.id) && !teamMemberIds.has(p.id),
	);

	const header = (
		<header className="flex items-center gap-3">
			<span className="text-4xl">{discipline.icon}</span>
			<div>
				<h1 className="text-2xl font-black">{discipline.name}</h1>
				<p className="text-xs text-white/50">
					{discipline.status === "done"
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

	if (isBracket) {
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
							return <span key={t.id}>{entrant ? `${entrant.emoji} ${entrant.name}` : "???"}</span>;
						})}
					</div>
					{sittingOut.length > 0 && (
						<p className="mt-2 text-xs text-white/40">
							Pauzuje: {sittingOut.map((p) => `${p.emoji} ${p.name}`).join(", ")}
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
