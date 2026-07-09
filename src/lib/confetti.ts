/**
 * Zero-dependency confetti + haptics for win moments. Imperative so it can fire
 * from anywhere (match result, champion reveal, TV screen) without a component.
 * DOM nodes are appended to <body> and removed after the animation finishes.
 */

const COLORS = ["#fbbf24", "#ff2d95", "#9d4edd", "#22d3ee", "#34d399", "#f2f0eb"];

function reducedMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
	);
}

/** Rain a burst of confetti pieces down the viewport. `big` = champion moment. */
export function fireConfetti(opts?: { big?: boolean }): void {
	if (typeof document === "undefined" || reducedMotion()) return;
	const big = opts?.big ?? false;
	const count = big ? 160 : 70;

	const container = document.createElement("div");
	container.className = "confetti-container";
	for (let i = 0; i < count; i++) {
		const piece = document.createElement("div");
		piece.className = "confetti-piece";
		const width = (big ? 8 : 6) + Math.random() * 6;
		piece.style.left = `${Math.random() * 100}vw`;
		piece.style.width = `${width}px`;
		piece.style.height = `${width * (0.4 + Math.random() * 0.6)}px`;
		piece.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
		piece.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
		piece.style.animationDelay = `${Math.random() * (big ? 0.5 : 0.25)}s`;
		piece.style.setProperty("--drift", `${(Math.random() * 2 - 1) * 140}px`);
		piece.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
		container.appendChild(piece);
	}

	document.body.appendChild(container);
	window.setTimeout(() => container.remove(), big ? 4200 : 3200);
}

/** Buzz the phone if it supports vibration (no-op on desktop). */
export function buzz(big = false): void {
	if (typeof navigator !== "undefined" && "vibrate" in navigator) {
		navigator.vibrate(big ? [60, 40, 120] : 40);
	}
}

/** Confetti + haptics together — the standard "you won" celebration. */
export function celebrate(big = false): void {
	fireConfetti({ big });
	buzz(big);
}
