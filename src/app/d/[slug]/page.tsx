"use client";

import Link from "next/link";
import { use, useState } from "react";
import Bracket from "@/components/Bracket";
import GroupTable from "@/components/GroupTable";
import MatchCard from "@/components/MatchCard";
import ScoreModal from "@/components/ScoreModal";
import { useTournament } from "@/lib/useTournament";
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

	if (discipline.status === "waiting") {
		return (
			<main className="flex flex-col items-center gap-4 pt-20 text-center">
				<span className="text-5xl">{discipline.icon}</span>
				<h1 className="text-2xl font-black">{discipline.name}</h1>
				<p className="text-white/50">Najpierw wylosuj grupy w setupie.</p>
				<Link href="/setup" className="rounded-2xl bg-accent px-6 py-3 font-bold text-black">
					⚙️ Idź do setupu
				</Link>
			</main>
		);
	}

	const groupMatches = (no: number) =>
		discipline.matches.filter((m) => m.stage === "group" && m.groupNo === no);
	const playoffStarted = discipline.matches.some((m) => m.stage !== "group");
	const activeGroup = discipline.groups.find((g) => g.no === tab);

	return (
		<main className="flex flex-col gap-5">
			<header className="flex items-center gap-3">
				<span className="text-4xl">{discipline.icon}</span>
				<div>
					<h1 className="text-2xl font-black">{discipline.name}</h1>
					<p className="text-xs text-white/50">
						{discipline.status === "done"
							? "Turniej zakończony 🏁"
							: discipline.status === "playoff"
								? "Faza playoff 🔥"
								: "Faza grupowa"}
					</p>
				</div>
			</header>

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
						<GroupTable group={activeGroup} playersById={playersById} />
					</section>
					<section className="flex flex-col gap-2">
						{groupMatches(activeGroup.no).map((m) => (
							<MatchCard
								key={m.id}
								match={m}
								playersById={playersById}
								subtitle={m.round ? `Runda ${m.round}` : undefined}
								onClick={() => setSelected(m)}
							/>
						))}
					</section>
				</>
			)}

			{tab === "playoff" && (
				<Bracket matches={discipline.matches} playersById={playersById} onSelect={setSelected} />
			)}

			{selected && (
				<ScoreModal
					match={selected}
					playersById={playersById}
					onClose={() => setSelected(null)}
					onSaved={() => mutate()}
				/>
			)}
		</main>
	);
}
