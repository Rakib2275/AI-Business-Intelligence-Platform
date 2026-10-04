"use client";

import { SessionProvider, useSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

function WorkspaceContent({ children }: { children: React.ReactNode }) {
	const { loading, user } = useSession();

	if (loading || !user) {
		return (
			<div className="session-loading">
				<span className="brand-mark">N</span>
				<div className="spinner" />
				<span>Opening your workspace…</span>
			</div>
		);
	}

	return <AppShell>{children}</AppShell>;
}

export default function WorkspaceLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SessionProvider>
			<WorkspaceContent>{children}</WorkspaceContent>
		</SessionProvider>
	);
}
