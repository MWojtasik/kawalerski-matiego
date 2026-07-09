"use client";

import { useSyncExternalStore } from "react";
import useSWR from "swr";
import type { DisciplineState, Entrant, Player, TournamentState } from "./types";

const fetcher = (url: string) =>
	fetch(url).then((r) => r.json() as Promise<TournamentState>);

export function useTournament() {
	const { data, mutate, isLoading } = useSWR<TournamentState>("/api/state", fetcher, {
		refreshInterval: 4000,
		revalidateOnFocus: true,
	});
	const playersById = new Map<number, Player>((data?.players ?? []).map((p) => [p.id, p]));
	return { state: data, playersById, mutate, isLoading };
}

/** Who a match slot refers to in this discipline: players, or teams for 2v2. */
export function entrantsFor(
	discipline: DisciplineState,
	playersById: Map<number, Player>,
): Map<number, Entrant> {
	if (discipline.format !== "bracket2v2") return playersById;
	return new Map(
		discipline.teams.map((team) => {
			const a = playersById.get(team.playerA);
			const b = playersById.get(team.playerB);
			return [
				team.id,
				{
					id: team.id,
					emoji: `${a?.emoji ?? "?"}${b?.emoji ?? ""}`,
					name: `${a?.name ?? "?"} + ${b?.name ?? "?"}`,
				},
			];
		}),
	);
}

const MY_PLAYER_KEY = "kawalerski_my_player_id";
const storeListeners = new Set<() => void>();

function subscribeToMyPlayer(callback: () => void) {
	storeListeners.add(callback);
	window.addEventListener("storage", callback);
	return () => {
		storeListeners.delete(callback);
		window.removeEventListener("storage", callback);
	};
}

/** Which player this device registered as (kept in localStorage). */
export function useMyPlayerId() {
	const raw = useSyncExternalStore(
		subscribeToMyPlayer,
		() => localStorage.getItem(MY_PLAYER_KEY),
		() => null,
	);
	function setMyPlayerId(id: number | null) {
		if (id === null) localStorage.removeItem(MY_PLAYER_KEY);
		else localStorage.setItem(MY_PLAYER_KEY, String(id));
		for (const listener of storeListeners) listener();
	}
	return { myPlayerId: raw === null ? null : Number(raw), setMyPlayerId };
}

/** Send JSON; throws Error with the server's Polish message on failure. */
export async function api<T = { ok: boolean }>(
	url: string,
	body?: unknown,
	method = "POST",
): Promise<T> {
	const response = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const data = (await response.json().catch(() => ({}))) as T & { error?: string };
	if (!response.ok) {
		throw new Error(data.error ?? `Błąd (${response.status})`);
	}
	return data;
}
