"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";

export default function SellerChangePasswordPage() {
	const router = useRouter();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		if (newPassword !== confirmPassword) {
			setError("The new passwords do not match.");
			return;
		}

		setBusy(true);
		try {
			await apiRequest("/seller/change-password", {
				method: "PATCH",
				body: { currentPassword, newPassword },
			});
			router.replace("/seller/dashboard");
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your password could not be changed.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="seller-password-screen">
			<section className="seller-password-card">
				<Link className="brand seller-password-brand" href="/">
					<span className="brand-mark">
						<Sparkles size={18} />
					</span>
					<span className="brand-name">
						noviq<span>.</span>
					</span>
				</Link>
				<div className="seller-password-icon">
					<LockKeyhole size={21} />
				</div>
				<span className="form-kicker">SECURE YOUR ACCOUNT</span>
				<h1>Set a new password</h1>
				<p>
					Your administrator created this account. Change the initial password
					to continue to your seller dashboard.
				</p>
				<form className="seller-password-form" onSubmit={handleSubmit}>
					<label htmlFor="current-password">Initial password</label>
					<input
						id="current-password"
						type="password"
						autoComplete="current-password"
						value={currentPassword}
						onChange={(event) => setCurrentPassword(event.target.value)}
						required
					/>
					<label htmlFor="new-password">New password</label>
					<input
						id="new-password"
						type="password"
						autoComplete="new-password"
						minLength={8}
						maxLength={20}
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						required
					/>
					<small>
						8–20 characters with uppercase, lowercase, a number, and a special
						character.
					</small>
					<label htmlFor="confirm-password">Confirm new password</label>
					<input
						id="confirm-password"
						type="password"
						autoComplete="new-password"
						minLength={8}
						maxLength={20}
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						required
					/>
					{error && (
						<div className="form-error" role="alert">
							{error}
						</div>
					)}
					<button
						className="button button-primary login-submit"
						type="submit"
						disabled={busy}
					>
						{busy ? "Saving…" : "Change password"}
						{!busy && <ArrowRight size={17} />}
					</button>
				</form>
			</section>
		</main>
	);
}
