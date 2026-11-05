"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ImagePlus, Mail, ShieldCheck, UserRound, Phone, Pencil, Check, X } from "lucide-react";
import { ErrorNotice, LoadingBlock, PageHeading, StatusPill } from "@/components/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

type Profile = User & {
	contactNumber?: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
};

const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, {
		dateStyle: "long",
	}).format(new Date(value));

export default function ProfilePage() {
	const { user, refresh } = useSession();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [name, setName] = useState("");
	const [contactNumber, setContactNumber] = useState("");
	const [notice, setNotice] = useState("");

	const loadProfile = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await apiRequest<Profile>("/auth/me");
			setProfile(response.data);
			setName(response.data.name);
			setContactNumber(response.data.contactNumber || "");
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

	const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError("");
		setNotice("");
		try {
			const response = await apiRequest<Profile>("/user/profile", {
				method: "PATCH",
				body: { name: name.trim(), contactNumber: contactNumber.trim() },
			});
			setProfile((current) => current ? { ...current, ...response.data } : response.data);
			await refresh();
			setNotice("Profile updated successfully.");
			setEditing(false);
		} catch (caught) {
			setError(caught instanceof ApiError ? caught.message : "Your profile could not be updated.");
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => {
		void loadProfile();
	}, [loadProfile]);

	const initial = user?.name.trim().charAt(0).toUpperCase() || "U";

	return (
		<>
			<PageHeading
				eyebrow="YOUR ACCOUNT"
				title="My profile"
				description="Click your profile picture to change it."
			/>

			{error && <ErrorNotice message={error} onRetry={() => void loadProfile()} />}
			{loading ? (
				<LoadingBlock label="Loading your profile" />
			) : (
				profile && (
					<section className="profile-card panel">
						<div className="profile-card-heading">
							<Link
								className="profile-card-avatar profile-avatar-link"
								href="/profile-picture"
								aria-label="Change profile picture"
								title="Change profile picture"
							>
								{user?.imageUrl ? (
									<img src={user.imageUrl} alt="" />
								) : (
									initial
								)}
								<span className="profile-avatar-hint">
									<ImagePlus size={14} /> Change photo
								</span>
							</Link>
							<div className="profile-card-identity">
								<h2>{profile.name}</h2>
								<p>{profile.email}</p>
							</div>
							<StatusPill status={profile.status} />
						</div>

						{notice && <p className="profile-picture-message profile-picture-success" role="status">{notice}</p>}
						{editing ? (
							<form className="profile-details-grid" onSubmit={saveProfile}>
								<label className="profile-detail"><span className="profile-detail-icon"><UserRound size={16} /></span><div><span>Full name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} /></div></label>
								<label className="profile-detail"><span className="profile-detail-icon"><Phone size={16} /></span><div><span>Contact number</span><input className="input" type="tel" value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} maxLength={30} placeholder="Add your phone number" /></div></label>
								<div className="profile-detail"><span className="profile-detail-icon"><Mail size={16} /></span><div><span>Email address</span><strong>{profile.email}</strong></div></div>
								<div className="profile-detail"><span className="profile-detail-icon"><ShieldCheck size={16} /></span><div><span>Account role</span><strong>{profile.role.replaceAll("_", " ")}</strong></div></div>
								<div className="profile-detail"><span className="profile-detail-icon"><CalendarDays size={16} /></span><div><span>Member since</span><strong>{formatDate(profile.createdAt)}</strong></div></div>
								<div className="profile-edit-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(false); setName(profile.name); setContactNumber(profile.contactNumber || ""); }}><X size={15} /> Cancel</button><button className="button button-primary" type="submit" disabled={saving}><Check size={15} /> {saving ? "Saving…" : "Save changes"}</button></div>
							</form>
						) : <div className="profile-details-grid">
							<div className="profile-detail">
								<span className="profile-detail-icon">
									<UserRound size={16} />
								</span>
								<div>
									<span>Full name</span>
									<strong>{profile.name}</strong>
								</div>
							</div>
							<div className="profile-detail"><span className="profile-detail-icon"><Phone size={16} /></span><div><span>Contact number</span><strong>{profile.contactNumber || "Not added"}</strong></div></div>
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
						</div>}

						{!editing && <button className="profile-picture-link" type="button" onClick={() => { setNotice(""); setEditing(true); }}><Pencil size={15} /> Profile Update <ArrowUpRight size={14} /></button>}
					</section>
				)
			)}
		</>
	);
}
