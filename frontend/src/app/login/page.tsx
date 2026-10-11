"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
	ArrowRight,
	Eye,
	EyeOff,
	LockKeyhole,
	Mail,
	Sparkles,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setBusy(true);
		try {
			await apiRequest("/auth/login", {
				method: "POST",
				body: { email, password },
			});
			const { data: user } = await apiRequest<{ role: string }>("/auth/me");
			const nextPath = new URLSearchParams(window.location.search).get("next");
			const isCheckoutPath =
				nextPath !== null && /^\/checkout\/[a-zA-Z0-9_-]+$/.test(nextPath);
			window.location.assign(
				isCheckoutPath && user.role === "COUSTOMER"
					? nextPath
					: user.role === "COUSTOMER"
						? "/"
						: "/dashboard",
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Sign-in could not be completed.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="login-screen">
			<div className="login-left">
				<a className="brand login-brand" href="/login">
					<span className="brand-mark">
						<Sparkles size={18} />
					</span>
					<span className="brand-name">
						noviq<span>.</span>
					</span>
				</a>
				<div className="login-copy">
					<div className="eyebrow">
						<span className="eyebrow-dot" /> BUSINESS INTELLIGENCE, IN FOCUS
					</div>
					<h1>
						Clarity starts
						<br />
						with a <span>better questions.</span>
					</h1>
					<p>
						Your data has a story. Ask it in plain language, discover the
						signal, and share the insight with your team.
					</p>
					<div className="login-preview">
						<div className="preview-header">
							<span className="preview-dot" />
							<span>YOUR BUSINESS, IN CONTEXT</span>
							<span className="preview-dash">···</span>
						</div>
						<div className="preview-question">
							<span>YOU ASKED</span>
							<p>Which products grew fastest this quarter?</p>
						</div>
						<div className="preview-insight">
							<span className="insight-star">
								<Sparkles size={13} />
							</span>
							<div>
								<strong>A clear answer, grounded in your data.</strong>
								<small>Validated SQL · Live dataset · Ready to visualize</small>
							</div>
						</div>
						<div className="preview-bars">
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
							<i />
						</div>
					</div>
				</div>
				<div className="login-copyright">
					© {new Date().getFullYear()} Noviq
				</div>
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
					<span className="form-kicker">WELCOME BACK</span>
					<h2>Sign in to your workspace</h2>
					<p className="login-subtitle">
						Pick up where your last good question left off.
					</p>
					<form className="login-form" onSubmit={onSubmit}>
						<label htmlFor="email">Work email</label>
						<div className="input-with-icon">
							<Mail size={17} />
							<input
								id="email"
								type="email"
								autoComplete="username"
								placeholder="you@company.com"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
							/>
						</div>
						<div className="label-line">
							<label htmlFor="password">Password</label>
							<Link href="/forgot-password">Forgot password?</Link>
						</div>
						<div className="input-with-icon">
							<LockKeyhole size={17} />
							<input
								id="password"
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
								placeholder="Enter your password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								minLength={8}
								maxLength={20}
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
									Sign in <ArrowRight size={17} />
								</>
							)}
						</button>
					</form>
					<div className="login-security">
						<LockKeyhole size={14} /> Protected with secure, httpOnly session
						cookies
					</div>
					<div className="register-login-link">
						New to Noviq? <Link href="/register">Create an account</Link>
					</div>
				</div>
				<div className="login-footnote">
					A thoughtful home for your business data.
				</div>
			</div>
		</main>
	);
}
