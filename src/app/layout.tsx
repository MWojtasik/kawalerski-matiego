import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
	title: "Kawalerski Matiego 🍻",
	description: "Bilard, dart, ping-pong — kto zostanie Mistrzem Kawalerskiego?",
};

export const viewport: Viewport = {
	themeColor: "#0b0d13",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pl">
			<body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
				{children}
			</body>
		</html>
	);
}
