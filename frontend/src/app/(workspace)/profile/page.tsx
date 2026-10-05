"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ImagePlus, Mail, ShieldCheck, UserRound } from "lucide-react";
import { ErrorNotice, LoadingBlock, PageHeading, StatusPill } from "@/components/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

type Profile = User & {
	status: string;
	createdAt: string;
	updatedAt: string;
};

const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, {
		dateStyle: "long",
	}).format(new Date(value));

export default function ProfilePage() {
	const { user } = useSession();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const loadProfile = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await apiRequest<Profile>("/auth/me");
			setProfile(response.data);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your profile could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadProfile();
	}, [loadProfile]);

	const initial = user?.name.trim().charAt(0).toUpperCase() || "U";

	return (
		<>
			<PageHeading
				eyebrow="YOUR ACCOUNT"
				title="My profile"
				description="View your account details and manage your profile picture."
				action={
					<Link className="button button-secondary" href="/profile-picture">
						<ImagePlus size={15} /> Change profile picture
					</Link>
				}
			/>

			{error && <ErrorNotice message={error} onRetry={() => void loadProfile()} />}
			{loading ? (
				<LoadingBlock label="Loading your profile" />
			) : (
				profile && (
					<section className="profile-card panel">
						<div className="profile-card-heading">
							<div className="profile-card-avatar">
								{user?.imageUrl ? (
									<img src={user.imageUrl} alt="" />
								) : (
									initial
								)}
							</div>
							<div className="profile-card-identity">
								<h2>{profile.name}</h2>
								<p>{profile.email}</p>
							</div>
							<StatusPill status={profile.status} />
						</div>

						<div className="profile-details-grid">
							<div className="profile-detail">
								<span className="profile-detail-icon">
									<UserRound size={16} />
								</span>
								<div>
									<span>Full name</span>
									<strong>{profile.name}</strong>
								</div>
							</div>
							<div className="profile-detail">
								<span className="profile-detail-icon">
									<Mail size={16} />
								</span>
								<div>
									<span>Email address</span>
									<strong>{profile.email}</strong>
								</div>
							</div>
							<div className="profile-detail">
								<span className="profile-detail-icon">
									<ShieldCheck size={16} />
								</span>
								<div>
									<span>Account role</span>
									<strong>{profile.role.replaceAll("_", " ")}</strong>
								</div>
							</div>
							<div className="profile-detail">
								<span className="profile-detail-icon">
									<CalendarDays size={16} />
								</span>
								<div>
									<span>Member since</span>
									<strong>{formatDate(profile.createdAt)}</strong>
								</div>
							</div>
						</div>

						<Link className="profile-picture-link" href="/profile-picture">
							<ImagePlus size={15} />
							Update profile picture
							<ArrowUpRight size={14} />
						</Link>
					</section>
				)
			)}
		</>
	);
}
