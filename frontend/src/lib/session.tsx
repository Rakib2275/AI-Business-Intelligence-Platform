"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import type { User } from "@/lib/types";

type SessionValue = {
	user: User | null;
	loading: boolean;
	refresh: () => Promise<User>;
	logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const pathname = usePathname();
	const router = useRouter();

	const refresh = useCallback(async () => {
		const response = await apiRequest<User>("/auth/me");
		setUser(response.data);
		return response.data;
	}, []);

	const logout = useCallback(async () => {
		try {
			await apiRequest<null>("/auth/logout", { method: "POST" });
		} finally {
			setUser(null);
			router.replace("/login");
		}
	}, [router]);

	useEffect(() => {
		let active = true;
		setLoading(true);
		apiRequest<User>("/auth/me")
			.then((response) => {
				if (active) setUser(response.data);
			})
			.catch((error: unknown) => {
				if (active) {
					setUser(null);
					if (!(error instanceof ApiError) || error.status !== 401) {
						console.error("Session check failed:", error);
					}
				}
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!loading && !user && pathname !== "/login") router.replace("/login");
	}, [loading, user, pathname, router]);

	const value = useMemo(
		() => ({ user, loading, refresh, logout }),
		[user, loading, refresh, logout],
	);
	return (
		<SessionContext.Provider value={value}>{children}</SessionContext.Provider>
	);
}

export function useSession() {
	const context = useContext(SessionContext);
	if (!context)
		throw new Error("useSession must be used inside SessionProvider.");
	return context;
}
