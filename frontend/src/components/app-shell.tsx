"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	Activity,
	ArrowUpRight,
	BarChart3,
	Bot,
	ChevronDown,
	Command,
	Database,
	House,
	LayoutDashboard,
	LogOut,
	MessageSquareText,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { AccountMenu } from "@/components/account-menu";

const navItems = [
	{ label: "Home", href: "/", icon: House },
	{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ label: "Ask your data", href: "/conversations", icon: MessageSquareText },
	{ label: "Dashboards", href: "/dashboards", icon: BarChart3 },
	{ label: "Audit trail", href: "/audit", icon: ShieldCheck, admin: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout } = useSession();
	const [logoutError, setLogoutError] = useState("");
	const [mobileOpen, setMobileOpen] = useState(false);
	const visibleItems = navItems.filter(
		(item) =>
			!item.admin || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
	);
	const initial = user?.name.trim().charAt(0).toUpperCase() || "U";
	const pageName =
		pathname.startsWith("/profile-picture")
			? "Profile picture"
			: pathname === "/profile"
				? "My profile"
				: (navItems.find(
						(item) =>
							pathname === item.href ||
							(item.href !== "/" && pathname.startsWith(item.href)),
					)?.label ?? "Workspace");

	const handleLogout = async () => {
		setLogoutError("");
		try {
			await logout();
		} catch {
			setLogoutError("Sign out failed. Please try again.");
		}
	};

	return (
		<div className="workspace">
			<aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
				<Link className="brand" href="/dashboard" aria-label="Noviq home">
					<span className="brand-mark">
						<Sparkles size={18} />
					</span>
					<span className="brand-name">
						noviq<span>.</span>
					</span>
				</Link>

				<div className="workspace-switcher">
					<span className="workspace-avatar">A</span>
					<span className="workspace-switch-copy">
						<strong>Acme workspace</strong>
						<small>Business intelligence</small>
					</span>
					<ChevronDown size={15} />
				</div>

				<div className="nav-label">WORKSPACE</div>
				<nav className="main-nav" aria-label="Main navigation">
					{visibleItems.map(({ label, href, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							className={`nav-link ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "nav-link-active" : ""}`}
							onClick={() => setMobileOpen(false)}
						>
							<Icon size={18} strokeWidth={1.8} />
							<span>{label}</span>
							{href === "/conversations" && (
								<span className="nav-spark">
									<Sparkles size={13} />
								</span>
							)}
						</Link>
					))}
				</nav>

				<div className="sidebar-spacer" />
				<div className="sidebar-tip">
					<div className="tip-orbit">
						<Bot size={17} />
					</div>
					<strong>Your data, in context.</strong>
					<p>Ask a follow-up. Noviq remembers what matters.</p>
					<Link href="/conversations">
						Start a conversation <ArrowUpRight size={13} />
					</Link>
				</div>
				<div className="sidebar-footer">
					<Link className="sidebar-profile-link" href="/profile">
						<span className="user-avatar">
							{user?.imageUrl ? (
								<img src={user.imageUrl} alt="" />
							) : (
								initial
							)}
						</span>
						<span className="user-copy">
							<strong>{user?.name}</strong>
							<small>{user?.role?.replaceAll("_", " ")}</small>
						</span>
					</Link>
					<button
						className="icon-button logout-button"
						type="button"
						title="Sign out"
						onClick={handleLogout}
					>
						<LogOut size={17} />
					</button>
				</div>
				{logoutError && <p className="sidebar-error">{logoutError}</p>}
			</aside>

			<div className="main-column">
				<header className="topbar">
					<button
						type="button"
						className="mobile-menu"
						aria-label="Toggle navigation"
						onClick={() => setMobileOpen((open) => !open)}
					>
						<Command size={19} />
					</button>
					<div className="breadcrumb">
						<span>Workspace</span>
						<span className="crumb-slash">/</span>
						<strong>{pageName}</strong>
					</div>
					<div className="topbar-right">
						<div className="live-indicator">
							<span /> All systems operational
						</div>
						{user && (
							<AccountMenu
								user={user}
								onLogout={() => void handleLogout()}
							/>
						)}
					</div>
				</header>
				<main className="main-content">{children}</main>
				<footer className="app-footer">
					<span>
						<Activity size={13} /> NOVIQ
					</span>
					<span>
						<Database size={13} /> Your data stays yours
					</span>
				</footer>
			</div>
			{mobileOpen && (
				<button
					type="button"
					aria-label="Close navigation"
					className="mobile-scrim"
					onClick={() => setMobileOpen(false)}
				/>
			)}
			<button
				type="button"
				className="floating-ask"
				onClick={() => router.push("/conversations")}
			>
				<Sparkles size={17} /> Ask AI
			</button>
		</div>
	);
}
