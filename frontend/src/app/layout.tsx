import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Northstar BI · Business intelligence",
	description:
		"A clear view of your data, conversations, and business intelligence.",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
