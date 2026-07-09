"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
	{ href: "/", label: "Start", icon: "🏠" },
	{ href: "/d/bilard", label: "Bilard", icon: "🎱" },
	{ href: "/d/dart", label: "Dart", icon: "🎯" },
	{ href: "/d/pingpong", label: "Pong", icon: "🏓" },
	{ href: "/d/pilkarzyki", label: "Piłkarzyki", icon: "⚽" },
	{ href: "/general", label: "Ranking", icon: "🏆" },
];

export default function Nav() {
	const pathname = usePathname();
	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#11141c]/95 backdrop-blur">
			<div className="mx-auto flex max-w-2xl">
				{items.map((item) => {
					const active = pathname === item.href;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
								active ? "text-accent" : "text-white/60"
							}`}
						>
							<span className="text-xl">{item.icon}</span>
							<span className="max-w-full truncate px-0.5">{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
