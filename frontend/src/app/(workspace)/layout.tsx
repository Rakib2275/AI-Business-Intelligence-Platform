"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/session";
import { WorkspaceQueryProvider } from "@/lib/query-provider";
import { AppShell } from "@/components/app-shell";

function WorkspaceContent({ children }: { children: React.ReactNode }) {
	const { loading, user } = useSession();
	const pathname = usePathname() ?? "";
	const router = useRouter();
	const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
	const isSeller = user?.role === "SELLER";
	const isCustomer = user?.role === "COUSTOMER";
	const isAdminOnlyPage =
		pathname.startsWith("/admin") ||
		pathname === "/audit" ||
		pathname.startsWith("/audit/") ||
		pathname === "/dashboard" ||
		pathname.startsWith("/dashboard/");
	const isProductPage = pathname === "/products/new";
	const isSellerPage = pathname.startsWith("/seller/");
	const isAnalysisPage =
		pathname === "/dashboard" ||
		pathname.startsWith("/dashboard/") ||
		pathname === "/conversations" ||
		pathname.startsWith("/conversations/") ||
		pathname === "/dashboards" ||
		pathname.startsWith("/dashboards/");
	const forbidden =
		(isAdminOnlyPage && !isAdmin) ||
		(isProductPage && !isAdmin && !isSeller) ||
		(isSellerPage && !isSeller) ||
		(isAnalysisPage && isCustomer);

	useEffect(() => {
		if (!loading && user && forbidden) {
			router.replace(isSeller ? "/seller/dashboard" : "/");
		}
	}, [forbidden, isSeller, loading, router, user]);

	if (loading || !user || forbidden) {
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
		<WorkspaceQueryProvider>
			<SessionProvider>
				<WorkspaceContent>{children}</WorkspaceContent>
			</SessionProvider>
		</WorkspaceQueryProvider>
	);
}
