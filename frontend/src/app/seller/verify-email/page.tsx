"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck, Sparkles } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";

export default function SellerVerifyEmailPage() {
	const router = useRouter();
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setBusy(true);
		try {
			await apiRequest("/seller/initial-email-verification/verify", {
				method: "POST",
				body: { otp },
			});
			router.replace("/seller/dashboard");
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your email could not be verified.",
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
					<MailCheck size={21} />
				</div>
				<span className="form-kicker">VERIFY YOUR EMAIL</span>
				<h1>Check your inbox</h1>
				<p>
					Enter the 6-digit code sent to the email address on your seller
					account. Once verified, you'll go to your seller dashboard.
				</p>
				<form className="seller-password-form" onSubmit={handleSubmit}>
					<label htmlFor="seller-email-otp">Verification code</label>
					<input
						id="seller-email-otp"
						type="text"
						inputMode="numeric"
						autoComplete="one-time-code"
						pattern="[0-9]{6}"
						maxLength={6}
						value={otp}
						onChange={(event) =>
							setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
						}
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
						{busy ? "Verifying…" : "Verify email"}
						{!busy && <ArrowRight size={17} />}
					</button>
				</form>
			</section>
		</main>
	);
}
