"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Eye,
	EyeOff,
	LockKeyhole,
	Mail,
	Phone,
	Sparkles,
	UserRound,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";

export default function RegisterPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [contactNumber, setContactNumber] = useState("");
	const [password, setPassword] = useState("");
	const [otp, setOtp] = useState("");
	const [step, setStep] = useState<"details" | "verify">("details");
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setBusy(true);
		try {
			if (step === "details") {
				await apiRequest<null>("/auth/register", {
					method: "POST",
					body: {
						name,
						email,
						password,
						...(contactNumber ? { patient: { contactNumber } } : {}),
					},
				});
				setStep("verify");
			} else {
				await apiRequest("/auth/verify-email", {
					method: "POST",
					body: { email, otp },
				});
				router.replace("/");
			}
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your account could not be created.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="login-screen">
			<div className="login-left">
				<Link className="brand login-brand" href="/register">
					<span className="brand-mark">
						<Sparkles size={18} />
					</span>
					<span className="brand-name">
						noviq<span>.</span>
					</span>
				</Link>
				<div className="login-copy">
					<div className="eyebrow">
						<span className="eyebrow-dot" /> BUSINESS INTELLIGENCE, IN FOCUS
					</div>
					<h1>
						Make room
						<br />
						for <span>clear answers.</span>
					</h1>
					<p>
						Bring your business data into focus. Ask better questions, find the
						story in the numbers, and share what matters.
					</p>
					<div className="login-preview register-preview">
						<div className="preview-header">
							<span className="preview-dot" />
							<span>A BETTER VIEW STARTS HERE</span>
							<span className="preview-dash">···</span>
						</div>
						<div className="register-benefit">
							<span className="register-benefit-icon">
								<Sparkles size={15} />
							</span>
							<div>
								<strong>From question to insight</strong>
								<small>One workspace for your business intelligence</small>
							</div>
						</div>
						<div className="register-benefit">
							<span className="register-benefit-icon register-benefit-check">
								<Check size={15} />
							</span>
							<div>
								<strong>Built for your team</strong>
								<small>Keep useful answers close and ready to share</small>
							</div>
						</div>
					</div>
				</div>
				<div className="login-copyright">
					© {new Date().getFullYear()} Noviq
				</div>
			</div>
			<div className="login-right">
				<div className="login-form-wrap register-form-wrap">
					<div className="mobile-login-brand">
						<span className="brand-mark">
							<Sparkles size={18} />
						</span>
						<span className="brand-name">
							noviq<span>.</span>
						</span>
					</div>
					<span className="form-kicker">
						{step === "details" ? "A FRESH PERSPECTIVE" : "ONE LAST STEP"}
					</span>
					<h2>
						{step === "details" ? "Create your account" : "Verify your email"}
					</h2>
					<p className="login-subtitle">
						{step === "details"
							? "Set up your workspace and bring your data into focus."
							: `Enter the 6-digit code we sent to ${email}.`}
					</p>
					<form className="login-form" onSubmit={onSubmit}>
						{step === "details" ? (
							<>
								<label htmlFor="name">Full name</label>
								<div className="input-with-icon">
									<UserRound size={17} />
									<input
										id="name"
										autoComplete="name"
										placeholder="Your name"
										value={name}
										onChange={(event) => setName(event.target.value)}
										minLength={4}
										maxLength={20}
										required
									/>
								</div>
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
								<label htmlFor="contactNumber">
									Phone number <span className="optional-label">Optional</span>
								</label>
								<div className="input-with-icon">
									<Phone size={17} />
									<input
										id="contactNumber"
										type="tel"
										autoComplete="tel"
										placeholder="Add a contact number"
										value={contactNumber}
										onChange={(event) => setContactNumber(event.target.value)}
									/>
								</div>
								<label htmlFor="password">Password</label>
								<div className="input-with-icon">
									<LockKeyhole size={17} />
									<input
										id="password"
										type={showPassword ? "text" : "password"}
										autoComplete="new-password"
										placeholder="Create a strong password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										minLength={8}
										maxLength={20}
										pattern={`(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}`}
										required
									/>
									<button
										className="show-password"
										type="button"
										aria-label={showPassword ? "Hide password" : "Show password"}
										onClick={() => setShowPassword((show) => !show)}
									>
										{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
									</button>
								</div>
								<p className="password-hint">
									8–20 characters, with uppercase, lowercase, a number, and a
									special character (!@#$%^&*).
								</p>
							</>
						) : (
							<>
								<label htmlFor="otp">Verification code</label>
								<input
									className="register-otp-input"
									id="otp"
									inputMode="numeric"
									autoComplete="one-time-code"
									pattern="[0-9]{6}"
									maxLength={6}
									placeholder="000000"
									value={otp}
									onChange={(event) =>
										setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
									}
									required
								/>
								<p className="password-hint">
									The code is valid for 5 minutes. Check your inbox, including
									spam.
								</p>
								<button
									className="register-back"
									type="button"
									onClick={() => {
										setError("");
										setStep("details");
									}}
								>
									<ArrowLeft size={15} /> Change account details
								</button>
							</>
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
									{step === "details" ? "Create account" : "Verify and continue"}
									<ArrowRight size={17} />
								</>
							)}
						</button>
					</form>
					<div className="login-security">
						<LockKeyhole size={14} /> Your account is protected with secure sessions
					</div>
					<div className="register-login-link">
						Already have an account? <Link href="/login">Sign in</Link>
					</div>
				</div>
				<div className="login-footnote">
					A thoughtful home for your business data.
				</div>
			</div>
		</main>
	);
}