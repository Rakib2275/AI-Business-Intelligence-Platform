"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";

type ResetStep = "request" | "verify" | "complete";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [step, setStep] = useState<ResetStep>("request");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [status, setStatus] = useState("");

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setStatus("");
		if (step === "verify" && newPassword !== confirmPassword) {
			setError("The passwords do not match.");
			return;
		}

		setBusy(true);
		try {
			if (step === "request") {
				const response = await apiRequest<null>("/auth/forgot-password", {
					method: "POST",
					body: { email },
				});
				setStatus(response.message);
				setStep("verify");
			} else if (step === "verify") {
				await apiRequest<null>("/auth/reset-password", {
					method: "POST",
					body: { email, otp, newPassword },
				});
				setStep("complete");
			}
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Password reset could not be completed. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	const resendCode = async () => {
		setError("");
		setStatus("");
		setBusy(true);
		try {
			const response = await apiRequest<null>("/auth/forgot-password", {
				method: "POST",
				body: { email },
			});
			setStatus(response.message);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "A new reset code could not be sent. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="login-screen">
			<div className="login-left">
				<Link className="brand login-brand" href="/login">
					<span className="brand-mark">
						<Sparkles size={18} />
					</span>
					<span className="brand-name">
						noviq<span>.</span>
					</span>
				</Link>
				<div className="login-copy">
					<div className="eyebrow">
						<span className="eyebrow-dot" /> SECURE ACCOUNT RECOVERY
					</div>
					<h1>
						Back to
						<br />
						<span>clear answers.</span>
					</h1>
					<p>
						Request a one-time code by email, then choose a new password for
						your workspace.
					</p>
				</div>
				<div className="login-copyright">© {new Date().getFullYear()} Noviq</div>
			</div>
			<div className="login-right">
				<div className="login-form-wrap">
					<div className="mobile-login-brand">
						<span className="brand-mark">
							<Sparkles size={18} />
						</span>
						<span className="brand-name">
							noviq<span>.</span>
						</span>
					</div>
					<span className="form-kicker">ACCOUNT RECOVERY</span>
					<h2>
						{step === "request"
							? "Reset your password"
							: step === "verify"
								? "Check your email"
								: "Password updated"}
					</h2>
					<p className="login-subtitle">
						{step === "request"
							? "Enter your account email to request a reset code."
							: step === "verify"
								? `Enter the 6-digit code sent to ${email}. It expires in 5 minutes.`
								: "Your password has been reset. You can now sign in."}
					</p>

					{step !== "complete" ? (
						<form className="login-form" onSubmit={onSubmit}>
							<label htmlFor="email">Work email</label>
							<div className="input-with-icon">
								<Mail size={17} />
								<input
									id="email"
									type="email"
									autoComplete="email"
									placeholder="you@company.com"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
							</div>
							{step === "verify" && (
								<>
									<label htmlFor="otp">Reset code</label>
									<div className="input-with-icon">
										<KeyRound size={17} />
										<input
											id="otp"
											inputMode="numeric"
											autoComplete="one-time-code"
											placeholder="6-digit code"
											value={otp}
											onChange={(event) =>
												setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
											}
											minLength={6}
											maxLength={6}
											required
										/>
									</div>
									<label htmlFor="new-password">New password</label>
									<div className="input-with-icon">
										<LockKeyhole size={17} />
										<input
											id="new-password"
											type="password"
											autoComplete="new-password"
											placeholder="Create a new password"
											value={newPassword}
											onChange={(event) => setNewPassword(event.target.value)}
											minLength={8}
											maxLength={20}
											pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}"
											title="Use 8–20 characters with an uppercase letter, lowercase letter, number, and special character (!@#$%^&*)."
											required
										/>
									</div>
									<label htmlFor="confirm-password">Confirm new password</label>
									<div className="input-with-icon">
										<LockKeyhole size={17} />
										<input
											id="confirm-password"
											type="password"
											autoComplete="new-password"
											placeholder="Enter the new password again"
											value={confirmPassword}
											onChange={(event) =>
												setConfirmPassword(event.target.value)
											}
											minLength={8}
											maxLength={20}
											required
										/>
									</div>
								</>
							)}
							{status && (
								<div className="profile-picture-message profile-picture-success" role="status">
									{status}
								</div>
							)}
							{step === "verify" && (
								<button
									className="text-button"
									type="button"
									disabled={busy}
									onClick={() => void resendCode()}
								>
									Send a new reset code
								</button>
							)}
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
								{busy ? (
									<span className="button-spinner" />
								) : (
									<>
										{step === "request" ? "Send reset code" : "Reset password"}
										<ArrowRight size={17} />
									</>
								)}
							</button>
						</form>
					) : (
						<Link className="button button-primary login-submit" href="/login">
							Go to sign in <ArrowRight size={17} />
						</Link>
					)}
					<div className="register-login-link">
						<Link href="/login">
							<ArrowLeft size={13} /> Back to sign in
						</Link>
					</div>
				</div>
				<div className="login-footnote">
					A thoughtful home for your business data.
				</div>
			</div>
		</main>
	);
}
