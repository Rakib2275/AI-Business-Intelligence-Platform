"use client";

import Link from "next/link";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
	ArrowRight,
	ArrowUpRight,
	BarChart3,
	CircleHelp,
	Database,
	MessageSquareText,
	Plus,
	Sparkles,
	Trash2,
	Upload,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import type {
	Conversation,
	Dashboard,
	Dataset,
	QueryRecord,
} from "@/lib/types";
import {
	workspaceQueries,
	workspaceQueryKeys,
} from "@/lib/workspace-queries";
import {
	EmptyState,
	ErrorNotice,
	LoadingBlock,
	PageHeading,
	StatusPill,
} from "@/components/ui";

type OverviewState = {
	datasets: Dataset[];
	dashboards: Dashboard[];
	conversations: Conversation[];
	queries: QueryRecord[];
};

const emptyOverview: OverviewState = {
	datasets: [],
	dashboards: [],
	conversations: [],
	queries: [],
};

const maxDatasetSize = 10 * 1024 * 1024;
const datasetFileTypes = ".csv,.xls,.xlsx";

export default function OverviewPage() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [overview, setOverview] = useState<OverviewState>(emptyOverview);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [datasetActionError, setDatasetActionError] = useState("");
	const [datasetActionSuccess, setDatasetActionSuccess] = useState("");
	const [uploading, setUploading] = useState(false);
	const [deletingDatasetId, setDeletingDatasetId] = useState("");

	const loadOverview = useCallback(async () => {
		setLoading(true);
		setError("");
		const results = await Promise.allSettled([
			queryClient.fetchQuery(workspaceQueries.datasets()),
			queryClient.fetchQuery(workspaceQueries.dashboards(1, 6)),
			queryClient.fetchQuery(workspaceQueries.conversations(1, 5)),
			queryClient.fetchQuery(workspaceQueries.queryHistory()),
		]);
		const [datasets, dashboards, conversations, queries] = results;
		const failures = results.filter((result) => result.status === "rejected");
		if (failures.length === results.length) {
			const firstFailure = failures[0];
			setError(
				firstFailure?.status === "rejected"
					? firstFailure.reason instanceof ApiError
						? firstFailure.reason.message
						: "Workspace data could not be loaded."
					: "Workspace data could not be loaded.",
			);
		} else {
			setOverview({
				datasets: datasets.status === "fulfilled" ? datasets.value : [],
				dashboards:
					dashboards.status === "fulfilled" ? dashboards.value : [],
				conversations:
					conversations.status === "fulfilled" ? conversations.value : [],
				queries: queries.status === "fulfilled" ? queries.value : [],
			});
			if (failures.length)
				setError("Some workspace information could not be loaded.");
		}
		setLoading(false);
	}, [queryClient]);

	useEffect(() => {
		void loadOverview();
	}, [loadOverview]);

	const handleDatasetUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setDatasetActionError("");
		setDatasetActionSuccess("");
		if (!/\.(csv|xls|xlsx)$/i.test(file.name)) {
			setDatasetActionError("Choose a CSV, XLS, or XLSX file.");
			return;
		}
		if (file.size > maxDatasetSize) {
			setDatasetActionError("The file must be 10 MB or smaller.");
			return;
		}

		const formData = new FormData();
		formData.append("file", file);
		setUploading(true);
		try {
			const response = await apiRequest<Dataset>(
				"/business-data/upload",
				{ method: "POST", body: formData },
			);
			const dataset = response.data;
			setOverview((current) => ({
				...current,
				datasets: [
					dataset,
					...current.datasets.filter((item) => item.id !== dataset.id),
				],
			}));
			queryClient.setQueryData<Dataset[]>(
				workspaceQueryKeys.datasets,
				(datasets = []) => [
					dataset,
					...datasets.filter((item) => item.id !== dataset.id),
				],
			);
			setDatasetActionSuccess(`${response.data.name} uploaded successfully.`);
		} catch (caught) {
			setDatasetActionError(
				caught instanceof ApiError
					? caught.message
					: "The dataset could not be uploaded. Please try again.",
			);
		} finally {
			setUploading(false);
		}
	};

	const handleDatasetDelete = async (dataset: Dataset) => {
		if (
			!window.confirm(
				`Delete dataset "${dataset.name}"? This cannot be undone.`,
			)
		)
			return;

		setDatasetActionError("");
		setDatasetActionSuccess("");
		setDeletingDatasetId(dataset.id);
		try {
			await apiRequest<null>(`/business-data/${dataset.id}`, {
				method: "DELETE",
			});
			setOverview((current) => ({
				...current,
				datasets: current.datasets.filter((item) => item.id !== dataset.id),
			}));
			queryClient.setQueryData<Dataset[]>(
				workspaceQueryKeys.datasets,
				(datasets = []) => datasets.filter((item) => item.id !== dataset.id),
			);
			setDatasetActionSuccess(`${dataset.name} deleted successfully.`);
		} catch (caught) {
			setDatasetActionError(
				caught instanceof ApiError
					? caught.message
					: "The dataset could not be deleted. Please try again.",
			);
		} finally {
			setDeletingDatasetId("");
		}
	};

	const totalRows = overview.datasets.reduce(
		(total, dataset) => total + (dataset.rowCount ?? 0),
		0,
	);
	const successfulQueries = overview.queries.filter(
		(query) => query.status === "SUCCESS",
	);
	const recentQueries = [...overview.queries].slice(0, 4);
	const recentDatasets = overview.datasets.slice(0, 3);

	return (
		<>
			<PageHeading
				eyebrow="WORKSPACE SNAPSHOT"
				title="A clearer view of your business."
				description="Your data is ready when you are. Start with a question or pick up where you left off."
				action={
					<Link className="button button-primary" href="/conversations">
						<Sparkles size={16} /> Ask your data
					</Link>
				}
			/>
			{error && (
				<ErrorNotice message={error} onRetry={() => void loadOverview()} />
			)}

			<section className="welcome-panel">
				<div className="welcome-glow" />
				<div className="welcome-content">
					<div className="welcome-kicker">
						<span className="welcome-spark">
							<Sparkles size={14} />
						</span>{" "}
						YOUR AI BUSINESS ANALYST
					</div>
					<h2>What would you like to understand?</h2>
					<p>
						Ask a question in plain English. Get a validated answer, a clear
						visualization, and the context behind it.
					</p>
					<Link className="welcome-cta" href="/conversations">
						Start with a question <ArrowRight size={16} />
					</Link>
				</div>
				<div className="welcome-orbit orbit-one" />
				<div className="welcome-orbit orbit-two" />
				<div className="welcome-signal">
					<div className="signal-mini">
						<span />
						<span />
						<span />
						<span />
						<span />
						<span />
						<span />
					</div>
					<small>Answers grounded in your data</small>
				</div>
			</section>

			<section className="stat-grid" aria-label="Workspace summary">
				<article className="stat-card">
					<div className="stat-icon icon-indigo">
						<Database size={18} />
					</div>
					<div className="stat-label">CONNECTED DATA</div>
					<div className="stat-value">
						{loading ? "—" : overview.datasets.length}
					</div>
					<div className="stat-foot">
						{totalRows.toLocaleString()} rows available
					</div>
				</article>
				<article className="stat-card">
					<div className="stat-icon icon-mint">
						<BarChart3 size={18} />
					</div>
					<div className="stat-label">YOUR DASHBOARDS</div>
					<div className="stat-value">
						{loading ? "—" : overview.dashboards.length}
					</div>
					<div className="stat-foot">
						<Link href="/dashboards">
							Organize your insights <ArrowUpRight size={12} />
						</Link>
					</div>
				</article>
				<article className="stat-card">
					<div className="stat-icon icon-violet">
						<MessageSquareText size={18} />
					</div>
					<div className="stat-label">CONVERSATIONS</div>
					<div className="stat-value">
						{loading ? "—" : overview.conversations.length}
					</div>
					<div className="stat-foot">Your analysis, with context</div>
				</article>
				<article className="stat-card">
					<div className="stat-icon icon-amber">
						<CircleHelp size={18} />
					</div>
					<div className="stat-label">QUESTIONS ANSWERED</div>
					<div className="stat-value">
						{loading ? "—" : successfulQueries.length}
					</div>
					<div className="stat-foot">
						<span className="growth-up">
							<ArrowUpRight size={12} /> Read-only validated
						</span>
					</div>
				</article>
			</section>

			<div className="section-heading">
				<div>
					<div className="eyebrow">YOUR WORKSPACE</div>
					<h2>Pick up where you left off</h2>
				</div>
				<Link className="subtle-link" href="/conversations">
					All conversations <ArrowRight size={14} />
				</Link>
			</div>
			{loading ? (
				<LoadingBlock label="Loading your recent work" />
			) : overview.conversations.length ? (
				<section className="conversation-cards">
					{overview.conversations.slice(0, 3).map((conversation, index) => (
						<Link
							className="recent-conversation"
							href={`/conversations?id=${conversation.id}`}
							key={conversation.id}
						>
							<div className={`recent-icon recent-tone-${index % 3}`}>
								<MessageSquareText size={17} />
							</div>
							<div className="recent-copy">
								<strong>{conversation.title || "New conversation"}</strong>
								<small>
									{conversation._count?.messages ?? 0} messages · Updated{" "}
									{new Date(conversation.updatedAt).toLocaleDateString()}
								</small>
							</div>
							<ArrowRight size={16} className="recent-arrow" />
						</Link>
					))}
				</section>
			) : (
				<div className="panel panel-empty">
					<EmptyState
						title="Your first insight is one question away"
						description="Start a conversation and explore a dataset with natural language."
						action={
							<Link className="button button-secondary" href="/conversations">
								<Plus size={15} /> New conversation
							</Link>
						}
					/>
				</div>
			)}

			<div className="dashboard-bottom-grid">
				<section className="panel">
					<div className="panel-heading">
						<div>
							<div className="eyebrow">RECENT ACTIVITY</div>
							<h2>Query history</h2>
						</div>
						<Link className="subtle-link" href="/conversations">
							Explore <ArrowRight size={14} />
						</Link>
					</div>
					{loading ? (
						<LoadingBlock />
					) : recentQueries.length ? (
						<div className="activity-list">
							{recentQueries.map((query) => (
								<div className="activity-row" key={query.id}>
									<div className="activity-dot">
										<Sparkles size={13} />
									</div>
									<div className="activity-copy">
										<strong>{query.question}</strong>
										<small>
											{query.businessData?.name ?? "Dataset"} ·{" "}
											{new Date(query.createdAt).toLocaleString()}
										</small>
									</div>
									<StatusPill status={query.status} />
								</div>
							))}
						</div>
					) : (
						<div className="panel-blank">
							Questions you ask will show up here.
						</div>
					)}
				</section>
				<section className="panel datasets-panel">
					<div className="panel-heading">
						<div>
							<div className="eyebrow">READY TO EXPLORE</div>
							<h2>Your data</h2>
						</div>
						<>
							<input
								ref={fileInputRef}
								type="file"
								accept={datasetFileTypes}
								hidden
								onChange={(event) => void handleDatasetUpload(event)}
							/>
							<button
								className="button button-secondary button-small"
								type="button"
								disabled={uploading || Boolean(deletingDatasetId)}
								onClick={() => fileInputRef.current?.click()}
							>
								<Upload size={14} />
								{uploading ? "Uploading…" : "Upload dataset"}
							</button>
						</>
					</div>
					{loading ? (
						<LoadingBlock />
					) : recentDatasets.length ? (
						<div className="dataset-list">
							{recentDatasets.map((dataset) => (
								<div className="dataset-row" key={dataset.id}>
									<span className="dataset-grid-icon">
										<Database size={15} />
									</span>
									<div className="dataset-copy">
										<strong>{dataset.name}</strong>
										<small>
											{dataset.rowCount?.toLocaleString() ?? "—"} rows ·{" "}
											{dataset.columnCount ?? "—"} columns
										</small>
									</div>
									<Link
										href={`/conversations?dataset=${dataset.id}`}
										className="dataset-ask"
									>
										Ask <ArrowUpRight size={12} />
									</Link>
									<button
										className="icon-button dataset-delete"
										type="button"
										aria-label={`Delete ${dataset.name}`}
										title="Delete dataset"
										disabled={uploading || Boolean(deletingDatasetId)}
										onClick={() => void handleDatasetDelete(dataset)}
									>
										<Trash2 size={14} />
									</button>
								</div>
							))}
						</div>
					) : (
						<div className="panel-blank">
							Upload a CSV or Excel file (up to 10 MB) to start exploring.
						</div>
					)}
					{datasetActionError && (
						<ErrorNotice message={datasetActionError} />
					)}
					{datasetActionSuccess && (
						<span className="status-pill status-good" role="status">
							{datasetActionSuccess}
						</span>
					)}
				</section>
			</div>
		</>
	);
}
