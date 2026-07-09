import Nav from "@/components/Nav";

/**
 * Layout for the phone-facing app pages: centered column + bottom nav.
 * The /tv kiosk screen lives outside this group so it can go full-bleed.
 */
export default function MainLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<div className="mx-auto min-h-dvh max-w-2xl px-4 pb-24 pt-6">{children}</div>
			<Nav />
		</>
	);
}
