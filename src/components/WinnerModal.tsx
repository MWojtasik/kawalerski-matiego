"use client";

import { useState } from "react";
import { api } from "@/lib/useTournament";
import type { Entrant, Match } from "@/lib/types";

export default function WinnerModal({
	match,
	entrantsById,
	onClose,
	onSaved,
}: {
	match: Match;
	entrantsById: Map<number, Entrant>;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function pick(winnerId: number) {
		setSaving(true);
		setError(null);
		try {
			await api(`/api/matches/${match.id}/result`, { winnerId });
			onSaved();
			onClose();
		} catch (e) {
			setError((e as Error).message);
			setSaving(false);
		}
	}

	const contenders = [match.playerA, match.playerB].map((id) => entrantsById.get(id));

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-t-3xl bg-[#171b26] p-6 pb-8 sm:rounded-3xl"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="mb-1 text-center text-lg font-semibold">Kto wygrał?</h3>
				{match.winnerId !== null && (
					<p className="text-center text-xs text-white/40">
						(poprawiasz wpisany wynik)
					</p>
				)}
				<div className="mt-5 flex flex-col gap-3">
					{contenders.map(
						(entrant) =>
							entrant && (
								<button
									key={entrant.id}
									type="button"
									disabled={saving}
									onClick={() => pick(entrant.id)}
									className={`rounded-2xl px-4 py-4 text-lg font-bold active:scale-[0.98] disabled:opacity-50 ${
										match.winnerId === entrant.id
											? "bg-accent text-black"
											: "bg-white/10"
									}`}
								>
									{entrant.name}
								</button>
							),
					)}
				</div>
				{error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
				<button
					type="button"
					onClick={onClose}
					className="mt-5 w-full rounded-2xl bg-white/5 py-3 text-sm text-white/60"
				>
					Anuluj
				</button>
			</div>
		</div>
	);
}
