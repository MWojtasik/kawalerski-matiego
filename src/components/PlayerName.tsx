import type { Player } from "@/lib/types";

export default function PlayerName({
	player,
	bold = false,
}: {
	player: Player | undefined;
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
