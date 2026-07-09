"use client";

import { useState } from "react";
import { api } from "@/lib/useTournament";
import type { Match, Player } from "@/lib/types";
import PlayerName from "./PlayerName";

function Stepper({
	value,
	onDelta,
}: {
	value: number;
	onDelta: (delta: number) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={() => onDelta(-1)}
				className="h-12 w-12 rounded-full bg-white/10 text-2xl active:bg-white/20"
			>
				−
			</button>
			<span className="w-10 text-center text-3xl font-bold tabular-nums">{value}</span>
			<button
				type="button"
				onClick={() => onDelta(1)}
				className="h-12 w-12 rounded-full bg-white/10 text-2xl active:bg-white/20"
			>
				+
			</button>
		</div>
	);
}

export default function ScoreModal({
	match,
	playersById,
	onClose,
	onSaved,
}: {
	match: Match;
	playersById: Map<number, Player>;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
	const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function save() {
		setSaving(true);
		setError(null);
		try {
			await api(`/api/matches/${match.id}/result`, { scoreA, scoreB });
			onSaved();
			onClose();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-t-3xl bg-[#171b26] p-6 pb-8 sm:rounded-3xl"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="mb-6 text-center text-lg font-semibold">Wynik meczu</h3>
				<div className="flex flex-col gap-5">
					<div className="flex items-center justify-between gap-4">
						<PlayerName player={playersById.get(match.playerA)} bold />
						<Stepper value={scoreA} onDelta={(d) => setScoreA((s) => Math.max(0, s + d))} />
					</div>
					<div className="flex items-center justify-between gap-4">
						<PlayerName player={playersById.get(match.playerB)} bold />
						<Stepper value={scoreB} onDelta={(d) => setScoreB((s) => Math.max(0, s + d))} />
					</div>
				</div>
				{error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
				<div className="mt-6 flex gap-3">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 rounded-2xl bg-white/10 py-3.5 font-semibold active:bg-white/20"
					>
						Anuluj
					</button>
					<button
						type="button"
						onClick={save}
						disabled={saving || scoreA === scoreB}
						className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-black disabled:opacity-40"
					>
						{saving ? "Zapisuję…" : "Zapisz"}
					</button>
				</div>
				{scoreA === scoreB && (
					<p className="mt-3 text-center text-xs text-white/50">Remisów nie ma — ktoś musi wygrać 😉</p>
				)}
			</div>
		</div>
	);
}
