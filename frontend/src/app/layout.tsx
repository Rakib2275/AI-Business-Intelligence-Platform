import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Noviq · Business intelligence",
	description:
		"Discover products and explore business intelligence with Noviq.",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body suppressHydrationWarning>{children}</body>
		</html>
	);
}
