"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/types";

type AccountMenuProps = {
	user: User;
	onLogout: () => void;
	logoutPending?: boolean;
};

export function AccountMenu({
	user,
	onLogout,
	logoutPending = false,
}: AccountMenuProps) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const initial = user.name.trim().charAt(0).toUpperCase() || "U";

	useEffect(() => {
		if (!open) return;
		const closeOnOutsideClick = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);

	return (
		<div className="account-menu" ref={menuRef}>
			<button
				className="account-menu-trigger"
				type="button"
				aria-label="Open account menu"
				aria-haspopup="menu"
				aria-expanded={open}
				title={user.name}
				onClick={() => setOpen((isOpen) => !isOpen)}
			>
				<span className="topbar-avatar">
					{user.imageUrl ? <img src={user.imageUrl} alt="" /> : initial}
				</span>
				<span className="account-menu-chevron" aria-hidden="true">⌄</span>
			</button>
			{open && (
				<div className="account-menu-popover" role="menu">
					<div className="account-menu-identity">
						<strong>{user.name}</strong>
						<small>{user.email}</small>
					</div>
					<Link
						href="/profile"
						role="menuitem"
						onClick={() => setOpen(false)}
					>
						<UserRound size={15} /> Profile
					</Link>
					<button
						type="button"
						role="menuitem"
						disabled={logoutPending}
						onClick={() => {
							setOpen(false);
							onLogout();
						}}
					>
						<LogOut size={15} />
						{logoutPending ? "Signing out…" : "Logout"}
					</button>
				</div>
			)}
		</div>
	);
}
