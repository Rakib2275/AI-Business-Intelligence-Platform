"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	BarChart3,
	Grid2X2,
	Plus,
	Sparkles,
	Trash2,
} from "lucide-react";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import {
	EmptyState,
	ErrorNotice,
	LoadingBlock,
	Modal,
	PageHeading,
} from "@/components/ui";

const palette = [
	"dashboard-ink",
	"dashboard-coral",
	"dashboard-blue",
	"dashboard-mint",
];

export default function DashboardsPage() {
	const router = useRouter();
	const [dashboards, setDashboards] = useState<Dashboard[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await apiRequest<Dashboard[]>(
				"/dashboards?page=1&limit=100",
			);
			setDashboards(response.data);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Dashboards could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const create = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError("");
		try {
			const response = await jsonRequest<Dashboard>("/dashboards", "POST", {
				name,
				description,
			});
			router.push(`/dashboards/${response.data.id}`);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Dashboard could not be created.",
			);
			setSaving(false);
		}
	};

	const remove = async (dashboard: Dashboard) => {
		if (!window.confirm(`Delete “${dashboard.name}” and all of its widgets?`))
			return;
		setError("");
		try {
			await apiRequest<null>(`/dashboards/${dashboard.id}`, {
				method: "DELETE",
			});
			setDashboards((current) =>
				current.filter((item) => item.id !== dashboard.id),
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Dashboard could not be deleted.",
			);
		}
	};

	return (
		<>
			<PageHeading
				eyebrow="YOUR BUSINESS AT A GLANCE"
				title="Dashboards"
				description="Bring the metrics and questions that matter together in one place."
				action={
					<button
						className="button button-primary"
						type="button"
						onClick={() => setShowCreate(true)}
					>
						<Plus size={16} /> Create dashboard
					</button>
				}
			/>
			{error && <ErrorNotice message={error} onRetry={() => void load()} />}
			{loading ? (
				<div className="panel">
					<LoadingBlock label="Loading your dashboards" />
				</div>
			) : dashboards.length ? (
				<section className="dashboard-card-grid">
					{dashboards.map((dashboard, index) => (
						<article className="dashboard-card" key={dashboard.id}>
							<Link
								className={`dashboard-card-art ${palette[index % palette.length]}`}
								href={`/dashboards/${dashboard.id}`}
							>
								<div className="card-art-top">
									<span>
										<Grid2X2 size={13} /> PERSONAL DASHBOARD
									</span>
									<span className="art-dots">···</span>
								</div>
								<div className="dashboard-art-chart">
									<div className="art-axis">
										<i />
										<i />
										<i />
										<i />
									</div>
									<svg
										viewBox="0 0 260 90"
										preserveAspectRatio="none"
										role="img"
										aria-label="Dashboard preview"
									>
										<path
											d="M 0 75 C 28 72, 36 60, 54 63 S 87 45, 104 52 S 126 28, 151 38 S 181 21, 198 30 S 224 8, 260 13"
											className="art-line"
										/>
										<path
											d="M 0 75 C 28 72, 36 60, 54 63 S 87 45, 104 52 S 126 28, 151 38 S 181 21, 198 30 S 224 8, 260 13 L 260 90 L 0 90 Z"
											className="art-fill"
										/>
									</svg>
									<div className="art-bars">
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
										<i />
										<i />
									</div>
								</div>
								<div className="art-footer">
									<span>
										<i /> DATA CONNECTED
									</span>
									<BarChart3 size={16} />
								</div>
							</Link>
							<div className="dashboard-card-content">
								<div className="dashboard-card-title">
									<Link href={`/dashboards/${dashboard.id}`}>
										{dashboard.name}
									</Link>
									{dashboard.isDefault && (
										<span className="default-badge">DEFAULT</span>
									)}
								</div>
								<p>
									{dashboard.description ||
										"A focused view of your business insights."}
								</p>
								<div className="dashboard-card-footer">
									<span>
										{dashboard._count?.widgets ?? 0} widgets · Updated{" "}
										{new Date(dashboard.updatedAt).toLocaleDateString()}
									</span>
									<div>
										<button
											className="icon-button card-delete"
											aria-label={`Delete ${dashboard.name}`}
											title="Delete dashboard"
											type="button"
											onClick={() => void remove(dashboard)}
										>
											<Trash2 size={15} />
										</button>
										<Link
											className="open-dashboard"
											href={`/dashboards/${dashboard.id}`}
											aria-label={`Open ${dashboard.name}`}
										>
											<ArrowRight size={16} />
										</Link>
									</div>
								</div>
							</div>
						</article>
					))}
					<button
						className="new-dashboard-card"
						type="button"
						onClick={() => setShowCreate(true)}
					>
						<span>
							<Plus size={19} />
						</span>
						<strong>Start a fresh view</strong>
						<small>Arrange your saved insights</small>
					</button>
				</section>
			) : (
				<div className="panel panel-empty">
					<EmptyState
						title="A dashboard shaped around your questions"
						description="Save successful analyses as widgets and keep your key insights close."
						action={
							<button
								type="button"
								className="button button-primary"
								onClick={() => setShowCreate(true)}
							>
								<Plus size={15} /> Create your first dashboard
							</button>
						}
					/>
				</div>
			)}
			<div className="dashboard-hint">
				<span>
					<Sparkles size={14} />
				</span>
				<p>
					<strong>Make it yours.</strong> Add widgets from successful queries,
					arrange them for your team, and refresh them whenever the data
					changes.
				</p>
			</div>
			{showCreate && (
				<Modal
					title="Create a dashboard"
					description="Start a focused view of the metrics that matter."
					onClose={() => setShowCreate(false)}
				>
					<form className="stack-form" onSubmit={create}>
						<label htmlFor="dashboard-name">Dashboard name</label>
						<input
							id="dashboard-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="e.g. Revenue overview"
							maxLength={120}
							required
						/>
						<label htmlFor="dashboard-description">
							Description <span className="optional-label">OPTIONAL</span>
						</label>
						<textarea
							id="dashboard-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="What will this dashboard help you understand?"
							maxLength={1000}
							rows={3}
						/>
						<div className="modal-actions">
							<button
								className="button button-quiet"
								type="button"
								onClick={() => setShowCreate(false)}
							>
								Cancel
							</button>
							<button
								className="button button-primary"
								type="submit"
								disabled={saving || name.trim().length === 0}
							>
								{saving ? "Creating…" : "Create dashboard"}{" "}
								<ArrowRight size={15} />
							</button>
						</div>
					</form>
				</Modal>
			)}
		</>
	);
}
