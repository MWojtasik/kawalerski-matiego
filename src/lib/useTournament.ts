"use client";

import useSWR from "swr";
import type { Player, TournamentState } from "./types";

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

/** POST JSON; throws Error with the server's Polish message on failure. */
export async function api(url: string, body?: unknown, method = "POST"): Promise<void> {
	const response = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok) {
		const data = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error ?? `Błąd (${response.status})`);
	}
}
