import type { Entrant } from "@/lib/types";

export default function PlayerName({
	player,
	bold = false,
	me = false,
}: {
	player: Entrant | undefined;
	bold?: boolean;
	/** highlight this name as the current device's player/team */
	me?: boolean;
}) {
	if (!player) return <span className="text-white/40">???</span>;
	return (
		<span className={`${bold ? "font-semibold" : ""} ${me ? "text-accent" : ""}`}>
			{player.name}
			{me && (
				<span className="ml-1 inline-block rounded bg-accent/20 px-1 py-px align-middle text-[10px] font-bold uppercase tracking-wide text-accent">
					ty
				</span>
			)}
		</span>
	);
}
