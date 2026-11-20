"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import type { QueryRecord } from "@/lib/types";
import { EmptyState, ErrorNotice, LoadingBlock, PageHeading } from "@/components/ui";

export default function ReportsPage() {
	const [queries, setQueries] = useState<QueryRecord[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [title, setTitle] = useState("Business analysis report");
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");

	useEffect(() => {
		let active = true;
		apiRequest<QueryRecord[]>("/query/history")
			.then((response) => {
				if (active) {
					setQueries(response.data.filter((query) => query.status === "SUCCESS"));
				}
			})
			.catch((caught: unknown) => {
				if (active) {
					setError(
						caught instanceof ApiError
							? caught.message
							: "Query history could not be loaded.",
					);
				}
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	const selectedQueries = useMemo(
		() => queries.filter((query) => selectedIds.includes(query.id)),
		[queries, selectedIds],
	);

	const toggleQuery = (id: string) => {
		setSelectedIds((current) =>
			current.includes(id)
				? current.filter((selectedId) => selectedId !== id)
				: current.length < 50
					? [...current, id]
					: current,
		);
		setNotice("");
	};

	const generateReport = async () => {
		if (!title.trim() || generating) return;
		setGenerating(true);
		setError("");
		setNotice("");
		try {
			const response = await fetch("/api/v1/reports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				cache: "no-store",
				body: JSON.stringify({
					title: title.trim(),
					...(selectedIds.length ? { queryIds: selectedIds } : {}),
				}),
			});
			if (!response.ok) {
				const payload: unknown = await response.json().catch(() => null);
				const message =
					typeof payload === "object" &&
					payload !== null &&
					"message" in payload &&
					typeof payload.message === "string"
						? payload.message
						: `Report generation failed (${response.status}).`;
				throw new ApiError(message, response.status);
			}
			const pdf = await response.blob();
			const objectUrl = URL.createObjectURL(pdf);
			const downloadLink = document.createElement("a");
			downloadLink.href = objectUrl;
			downloadLink.download = `${title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "business-report"}.pdf`;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			downloadLink.remove();
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
			setNotice("AI report generated and downloaded.");
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "AI report could not be generated.",
			);
		} finally {
			setGenerating(false);
		}
	};

	return (
		<>
			<PageHeading
				eyebrow="EVIDENCE-BASED REPORTS"
				title="AI reports"
				description="Turn successful data conversations into a concise business report with key findings and suggested next steps."
			/>
			{error && <ErrorNotice message={error} />}
			{notice && <div className="forecast-note report-success" role="status">{notice}</div>}
			{loading ? (
				<LoadingBlock label="Loading successful queries" />
			) : queries.length === 0 ? (
				<section className="panel panel-empty">
					<EmptyState
						title="No successful queries yet"
						description="Ask a question about a dataset first. Successful results can be included in an AI-generated report."
					/>
				</section>
			) : (
				<section className="panel forecast-panel">
					<div className="forecast-panel-heading">
						<span className="forecast-icon"><FileText size={16} /></span>
						<div>
							<strong>Report content</strong>
							<p>Select up to 50 successful questions, or leave all unchecked to use the latest 10.</p>
						</div>
					</div>
					<label className="forecast-field report-title-field">
						<span>Report title</span>
						<input
							value={title}
							maxLength={120}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</label>
					<div className="report-query-list">
						{queries.map((query) => (
							<label className="report-query" key={query.id}>
								<input
									type="checkbox"
									checked={selectedIds.includes(query.id)}
									disabled={!selectedIds.includes(query.id) && selectedIds.length >= 50}
									onChange={() => toggleQuery(query.id)}
								/>
								<span className="report-query-copy">
									<strong>{query.question}</strong>
									<small>
										{query.businessData?.name ?? "Dataset"} ·{" "}
										{new Date(query.createdAt).toLocaleString()}
									</small>
									{query.resultSummary && <span>{query.resultSummary}</span>}
								</span>
							</label>
						))}
					</div>
					<div className="forecast-actions">
						<button
							type="button"
							className="button button-primary"
							onClick={() => void generateReport()}
							disabled={generating || !title.trim() || (!selectedIds.length && !queries.length)}
						>
							<Download size={15} />
							{generating ? "Generating report…" : "Generate and download PDF"}
						</button>
						<span className="report-selection-count">
							{selectedQueries.length
								? `${selectedQueries.length} selected`
								: "Latest 10 successful queries"}
						</span>
					</div>
					<p className="forecast-data-note">
						Reports use saved query summaries. If AI synthesis fails, no summary-only PDF is returned.
					</p>
				</section>
			)}
		</>
	);
}
