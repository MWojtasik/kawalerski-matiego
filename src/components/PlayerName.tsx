import type { Entrant } from "@/lib/types";

export default function PlayerName({
	player,
	bold = false,
}: {
	player: Entrant | undefined;
	bold?: boolean;
}) {
	if (!player) return <span className="text-white/40">???</span>;
	return (
		<span className={bold ? "font-semibold" : ""}>
			<span className="mr-1">{player.emoji}</span>
			{player.name}
		</span>
	);
}
