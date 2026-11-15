"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ImagePlus, Mail, ShieldCheck, UserRound, Phone, Pencil, Check, X, LockKeyhole, Building2 } from "lucide-react";
import { ErrorNotice, LoadingBlock, PageHeading, StatusPill } from "@/components/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

type Profile = User & {
	contactNumber?: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
	businessProfile?: Record<string, unknown> | null;
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
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [contactNumber, setContactNumber] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [businessType, setBusinessType] = useState("");
	const [businessAddress, setBusinessAddress] = useState("");
	const [pendingEmail, setPendingEmail] = useState("");
	const [emailOtp, setEmailOtp] = useState("");
	const [verifyingEmail, setVerifyingEmail] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [changingPassword, setChangingPassword] = useState(false);
	const [notice, setNotice] = useState("");
	const isSeller = user?.role === "SELLER";

	const loadProfile = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await apiRequest<Profile>(
				isSeller ? "/seller/profile" : "/auth/me",
			);
			const loadedProfile = response.data;
			setProfile(loadedProfile);
			setName(loadedProfile.name);
			setUsername(loadedProfile.username || "");
			setEmail(loadedProfile.email);
			setContactNumber(loadedProfile.contactNumber || "");
			const business = loadedProfile.businessProfile || {};
			setCompanyName(
				typeof business.companyName === "string" ? business.companyName : "",
			);
			setBusinessType(
				typeof business.businessType === "string" ? business.businessType : "",
			);
			setBusinessAddress(
				typeof business.address === "string" ? business.address : "",
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your profile could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, [isSeller]);

	const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError("");
		setNotice("");
		try {
			if (isSeller) {
				const response = await apiRequest<{
					profile: Profile;
					emailVerificationRequired: boolean;
				}>("/seller/profile", {
					method: "PATCH",
					body: {
						name: name.trim(),
						username: username.trim(),
						email: email.trim(),
						contactNumber: contactNumber.trim(),
						businessProfile: {
							...(profile?.businessProfile || {}),
							companyName: companyName.trim(),
							businessType: businessType.trim(),
							address: businessAddress.trim(),
						},
					},
				});
				setProfile(response.data.profile);
				if (response.data.emailVerificationRequired) {
					setPendingEmail(email.trim());
					setEmailOtp("");
					setNotice(`A verification code was sent to ${email.trim()}.`);
				} else {
					setNotice("Profile updated successfully.");
				}
			} else {
				const response = await apiRequest<Profile>("/user/profile", {
					method: "PATCH",
					body: { name: name.trim(), contactNumber: contactNumber.trim() },
				});
				setProfile((current) =>
					current ? { ...current, ...response.data } : response.data,
				);
				setNotice("Profile updated successfully.");
			}
			await refresh();
			setEditing(false);
		} catch (caught) {
			setError(caught instanceof ApiError ? caught.message : "Your profile could not be updated.");
		} finally {
			setSaving(false);
		}
	};

	const verifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setNotice("");
		setVerifyingEmail(true);
		try {
			const response = await apiRequest<Profile>("/seller/profile/verify-email", {
				method: "POST",
				body: { email: pendingEmail, otp: emailOtp },
			});
			setProfile(response.data);
			setEmail(response.data.email);
			setPendingEmail("");
			setEmailOtp("");
			await refresh();
			setNotice("Email address verified and updated.");
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "The email address could not be verified.",
			);
		} finally {
			setVerifyingEmail(false);
		}
	};

	const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setNotice("");
		if (newPassword !== confirmPassword) {
			setError("The new passwords do not match.");
			return;
		}
		setChangingPassword(true);
		try {
			await apiRequest("/seller/change-password", {
				method: "PATCH",
				body: { currentPassword, newPassword },
			});
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setNotice("Password changed successfully.");
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your password could not be changed.",
			);
		} finally {
			setChangingPassword(false);
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
								<label className="profile-detail">
									<span className="profile-detail-icon"><UserRound size={16} /></span>
									<div>
										<span>Full name</span>
										<input className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
									</div>
								</label>
								<label className="profile-detail">
									<span className="profile-detail-icon"><Phone size={16} /></span>
									<div>
										<span>Contact number</span>
										<input className="input" type="tel" value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} maxLength={30} placeholder="Add your phone number" />
									</div>
								</label>
								{isSeller ? (
									<>
										<label className="profile-detail">
											<span className="profile-detail-icon"><UserRound size={16} /></span>
											<div>
												<span>Username</span>
												<input className="input" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={30} required />
											</div>
										</label>
										<label className="profile-detail">
											<span className="profile-detail-icon"><Mail size={16} /></span>
											<div>
												<span>Email address</span>
												<input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
											</div>
										</label>
										<label className="profile-detail">
											<span className="profile-detail-icon"><Building2 size={16} /></span>
											<div>
												<span>Business name</span>
												<input className="input" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
											</div>
										</label>
										<label className="profile-detail">
											<span className="profile-detail-icon"><Building2 size={16} /></span>
											<div>
												<span>Business type</span>
												<input className="input" value={businessType} onChange={(event) => setBusinessType(event.target.value)} />
											</div>
										</label>
										<label className="profile-detail">
											<span className="profile-detail-icon"><Building2 size={16} /></span>
											<div>
												<span>Business address</span>
												<input className="input" value={businessAddress} onChange={(event) => setBusinessAddress(event.target.value)} />
											</div>
										</label>
									</>
								) : (
									<div className="profile-detail">
										<span className="profile-detail-icon"><Mail size={16} /></span>
										<div><span>Email address</span><strong>{profile.email}</strong></div>
									</div>
								)}
								<div className="profile-detail">
									<span className="profile-detail-icon"><ShieldCheck size={16} /></span>
									<div><span>Account role</span><strong>{profile.role.replaceAll("_", " ")}</strong></div>
								</div>
								<div className="profile-detail">
									<span className="profile-detail-icon"><CalendarDays size={16} /></span>
									<div><span>Member since</span><strong>{formatDate(profile.createdAt)}</strong></div>
								</div>
								<div className="profile-edit-actions">
									<button className="button button-secondary" type="button" onClick={() => {
										setEditing(false);
										setName(profile.name);
										setUsername(profile.username || "");
										setEmail(profile.email);
										setContactNumber(profile.contactNumber || "");
										const business = profile.businessProfile || {};
										setCompanyName(typeof business.companyName === "string" ? business.companyName : "");
										setBusinessType(typeof business.businessType === "string" ? business.businessType : "");
										setBusinessAddress(typeof business.address === "string" ? business.address : "");
									}}>
										<X size={15} /> Cancel
									</button>
									<button className="button button-primary" type="submit" disabled={saving}>
										<Check size={15} /> {saving ? "Saving…" : "Save changes"}
									</button>
								</div>
							</form>
						) : (
							<div className="profile-details-grid">
								<div className="profile-detail">
									<span className="profile-detail-icon"><UserRound size={16} /></span>
									<div><span>Full name</span><strong>{profile.name}</strong></div>
								</div>
								<div className="profile-detail">
									<span className="profile-detail-icon"><Phone size={16} /></span>
									<div><span>Contact number</span><strong>{profile.contactNumber || "Not added"}</strong></div>
								</div>
								{isSeller && (
									<div className="profile-detail">
										<span className="profile-detail-icon"><UserRound size={16} /></span>
										<div><span>Username</span><strong>{profile.username || "Not set"}</strong></div>
									</div>
								)}
								<div className="profile-detail">
									<span className="profile-detail-icon"><Mail size={16} /></span>
									<div><span>Email address</span><strong>{profile.email}</strong></div>
								</div>
								{isSeller && (
									<>
										<div className="profile-detail">
											<span className="profile-detail-icon"><Building2 size={16} /></span>
											<div><span>Business name</span><strong>{companyName || "Not added"}</strong></div>
										</div>
										<div className="profile-detail">
											<span className="profile-detail-icon"><Building2 size={16} /></span>
											<div><span>Business type</span><strong>{businessType || "Not added"}</strong></div>
										</div>
										<div className="profile-detail">
											<span className="profile-detail-icon"><Building2 size={16} /></span>
											<div><span>Business address</span><strong>{businessAddress || "Not added"}</strong></div>
										</div>
									</>
								)}
								<div className="profile-detail">
									<span className="profile-detail-icon"><ShieldCheck size={16} /></span>
									<div><span>Account role</span><strong>{profile.role.replaceAll("_", " ")}</strong></div>
								</div>
								<div className="profile-detail">
									<span className="profile-detail-icon"><CalendarDays size={16} /></span>
									<div><span>Member since</span><strong>{formatDate(profile.createdAt)}</strong></div>
								</div>
							</div>
						)}

						{!editing && <button className="profile-picture-link" type="button" onClick={() => { setNotice(""); setEditing(true); }}><Pencil size={15} /> Profile Update <ArrowUpRight size={14} /></button>}
					</section>
				)
			)}
			{isSeller && pendingEmail && (
				<section className="panel seller-email-verify-panel">
					<h2>Verify your new email</h2>
					<p>Enter the six-digit code sent to {pendingEmail}.</p>
					<form onSubmit={verifyEmail}>
						<label>
							<span>Verification code</span>
							<input
								className="input"
								inputMode="numeric"
								autoComplete="one-time-code"
								minLength={6}
								maxLength={6}
								value={emailOtp}
								onChange={(event) =>
									setEmailOtp(event.target.value.replace(/\D/g, ""))
								}
								required
							/>
						</label>
						<button className="button button-primary" type="submit" disabled={verifyingEmail}>
							<Check size={15} /> {verifyingEmail ? "Verifying…" : "Verify email"}
						</button>
					</form>
				</section>
			)}
			{isSeller && (
				<section className="panel seller-password-settings">
					<div className="panel-heading">
						<div>
							<div className="eyebrow">ACCOUNT SECURITY</div>
							<h2>Change password</h2>
						</div>
						<LockKeyhole size={18} />
					</div>
					<form onSubmit={changePassword}>
						<label>
							<span>Current password</span>
							<input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
						</label>
						<label>
							<span>New password</span>
							<input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={20} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
						</label>
						<label>
							<span>Confirm new password</span>
							<input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={20} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
						</label>
						<button className="button button-primary" type="submit" disabled={changingPassword}>
							<LockKeyhole size={15} /> {changingPassword ? "Changing…" : "Change password"}
						</button>
					</form>
				</section>
			)}
		</>
	);
}
