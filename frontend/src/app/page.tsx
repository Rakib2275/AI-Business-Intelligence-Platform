"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	ArrowUpRight,
	BarChart3,
	Database,
	MessageSquareText,
	Sparkles,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import type { User } from "@/lib/types";

const capabilities = [
	{
		icon: Database,
		label: "Connect your data",
		description: "Bring your business information together in one workspace.",
	},
	{
		icon: MessageSquareText,
		label: "Ask better questions",
		description: "Explore your data in plain language with an AI analyst.",
	},
	{
		icon: BarChart3,
		label: "Share clear insights",
		description: "Turn answers into dashboards your whole team can use.",
	},
];

export default function HomePage() {
	const router = useRouter();

	useEffect(() => {
		let active = true;
		apiRequest<User>("/auth/me")
			.then(() => {
				if (active) router.replace("/dashboard");
			})
			.catch((error: unknown) => {
				if (
					active &&
					(!(error instanceof ApiError) || error.status !== 401)
				) {
					console.error("Session check failed:", error);
				}
			});
		return () => {
			active = false;
		};
	}, [router]);

	return (
		<div className="public-home">
			<header className="public-topbar">
				<Link className="brand public-brand" href="/" aria-label="Northstar home">
					<span className="brand-mark">
						<Sparkles size={18} />
					</span>
					<span className="brand-name">
						northstar<span>.</span>
					</span>
				</Link>
				<nav className="public-nav" aria-label="Main navigation">
					<Link className="public-nav-current" href="/">
						Dashboard
					</Link>
					<div className="public-auth-links">
						<Link className="button button-quiet" href="/login">
							Log in
						</Link>
						<Link className="button button-primary" href="/register">
							Sign up <ArrowUpRight size={15} />
						</Link>
					</div>
				</nav>
			</header>

			<main className="public-dashboard">
				<section className="public-hero">
					<div className="public-hero-copy">
						<div className="eyebrow">
							<span className="eyebrow-dot" /> BUSINESS INTELLIGENCE, IN FOCUS
						</div>
						<h1>
							A clearer view
							<br />
							of your <span>business.</span>
						</h1>
						<p>
							Bring your data into focus. Ask better questions, find the story
							in the numbers, and share what matters.
						</p>
						<div className="public-hero-actions">
							<Link className="button button-primary" href="/register">
								Get started <ArrowRight size={16} />
							</Link>
							<Link className="button button-secondary" href="/login">
								Log in to your workspace
							</Link>
						</div>
					</div>
					<div className="public-preview" aria-label="Northstar workspace preview">
						<div className="public-preview-header">
							<div>
								<span className="public-preview-kicker">YOUR WORKSPACE</span>
								<h2>Business overview</h2>
							</div>
							<span className="public-live-badge">
								<span /> INSIGHT-READY
							</span>
						</div>
						<div className="public-preview-question">
							<span className="public-preview-icon">
								<Sparkles size={16} />
							</span>
							<div>
								<small>ASK YOUR DATA</small>
								<strong>What should I know about my business?</strong>
							</div>
							<ArrowRight size={16} />
						</div>
						<div className="public-preview-grid">
							{capabilities.map(({ icon: Icon, label }) => (
								<div className="public-preview-tile" key={label}>
									<Icon size={17} />
									<span>{label}</span>
								</div>
							))}
						</div>
						<div className="public-preview-chart" aria-hidden="true">
							<div className="public-chart-label">
								<span>Clear answers, grounded in your data</span>
								<span>•••</span>
							</div>
							<div className="public-chart-bars">
								{[34, 48, 39, 64, 52, 75, 61, 88, 70, 96, 77, 100].map(
									(height, index) => (
										<i key={index} style={{ height: `${height}%` }} />
									),
								)}
							</div>
						</div>
					</div>
				</section>

				<section className="public-capabilities" aria-label="What you can do">
					<div className="public-section-heading">
						<div>
							<div className="eyebrow">ONE PLACE TO FIND THE SIGNAL</div>
							<h2>Your business, in context.</h2>
						</div>
						<span>Everything you need to move from data to direction.</span>
					</div>
					<div className="public-capability-grid">
						{capabilities.map(({ icon: Icon, label, description }, index) => (
							<article className="public-capability-card" key={label}>
								<div className={`public-capability-icon public-tone-${index}`}>
									<Icon size={18} />
								</div>
								<h3>{label}</h3>
								<p>{description}</p>
							</article>
						))}
					</div>
				</section>
			</main>

			<footer className="public-footer">
				<span>
					<Sparkles size={13} /> NORTHSTAR INTELLIGENCE
				</span>
				<span>Your data stays yours</span>
			</footer>
		</div>
	);
}
