/**
 * Static QR pointing at the app root so guests can scan and register from their
 * phones. The SVG lives in public/join-qr.svg (regenerate with:
 * `npx qrcode -t svg -o public/join-qr.svg "https://kawalerski-matiego.pl/"`).
 */
export default function JoinQr({
	size = 150,
	caption = "📱 Zeskanuj i wbijaj do gry",
}: {
	size?: number;
	caption?: string | null;
}) {
	return (
		<div className="flex flex-col items-center gap-2">
			{/* eslint-disable-next-line @next/next/no-img-element -- static vector asset, no optimizer needed */}
			<img
				src="/join-qr.svg"
				alt="Kod QR do dołączenia do turnieju"
				width={size}
				height={size}
				style={{ width: size, height: size }}
				className="rounded-xl bg-white p-2"
			/>
			{caption && <span className="text-center text-xs text-white/50">{caption}</span>}
		</div>
	);
}
