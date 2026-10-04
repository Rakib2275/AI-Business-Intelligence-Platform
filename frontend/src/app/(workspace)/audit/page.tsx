"use client";

import { useCallback, useEffect, useState } from "react";
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Clock3,
	FilterX,
	Search,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { ApiError, apiRequest, queryString } from "@/lib/api";
import type { AuditEvent, PageMeta } from "@/lib/types";
import {
	EmptyState,
	ErrorNotice,
	LoadingBlock,
	Modal,
	PageHeading,
	StatusPill,
} from "@/components/ui";

const categories = [
	"AUTH",
	"USER",
	"DATA",
	"QUERY",
	"AI",
	"CONVERSATION",
	"DASHBOARD",
	"REPORT",
	"SYSTEM",
];
const statuses = ["SUCCESS", "FAILURE", "REJECTED"];
const firstPage: PageMeta = { page: 1, limit: 25, total: 0, totalPages: 0 };

export default function AuditPage() {
	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [meta, setMeta] = useState(firstPage);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState<AuditEvent | null>(null);
	const [searchInput, setSearchInput] = useState("");
	const [filters, setFilters] = useState({
		search: "",
		category: "",
		status: "",
		action: "",
		userId: "",
		resourceType: "",
		resourceId: "",
		from: "",
		to: "",
	});
	const [page, setPage] = useState(1);

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await apiRequest<AuditEvent[]>(
				`/audit${queryString({
					page,
					limit: 25,
					search: filters.search || undefined,
					category: filters.category || undefined,
					status: filters.status || undefined,
					action: filters.action || undefined,
					userId: filters.userId || undefined,
					resourceType: filters.resourceType || undefined,
					resourceId: filters.resourceId || undefined,
					from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
					to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
				})}`,
			);
			setEvents(response.data);
			setMeta(response.meta ?? firstPage);
		} catch (caught) {
			setError(
				caught instanceof ApiError && caught.status === 403
					? "Audit records are restricted to workspace administrators."
					: caught instanceof ApiError
						? caught.message
						: "Audit records could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, [filters, page]);

	useEffect(() => {
		void load();
	}, [load]);

	const applySearch = () => {
		setPage(1);
		setFilters((current) => ({ ...current, search: searchInput.trim() }));
	};

	const updateFilter = (
		key:
			| "category"
			| "status"
			| "action"
			| "userId"
			| "resourceType"
			| "resourceId"
			| "from"
			| "to",
		value: string,
	) => {
		setPage(1);
		setFilters((current) => ({ ...current, [key]: value }));
	};

	const resetFilters = () => {
		setSearchInput("");
		setPage(1);
		setFilters({
			search: "",
			category: "",
			status: "",
			action: "",
			userId: "",
			resourceType: "",
			resourceId: "",
			from: "",
			to: "",
		});
	};

	const dateLabel = (date: string) =>
		new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(date));

	return (
		<>
			<PageHeading
				eyebrow="SECURITY & GOVERNANCE"
				title="Audit trail"
				description="A transparent, searchable record of important workspace activity."
				action={
					<div className="audit-total">
						<ShieldCheck size={16} />
						<strong>{meta.total.toLocaleString()}</strong>
						<span>events recorded</span>
					</div>
				}
			/>
			{error && <ErrorNotice message={error} onRetry={() => void load()} />}
			<section className="audit-summary-grid">
				<div className="audit-summary-card">
					<span className="audit-summary-icon audit-icon-green">
						<ShieldCheck size={17} />
					</span>
					<div>
						<strong>PRIVATE BY DESIGN</strong>
						<small>Admin access only</small>
					</div>
				</div>
				<div className="audit-summary-card">
					<span className="audit-summary-icon audit-icon-blue">
						<Clock3 size={17} />
					</span>
					<div>
						<strong>TIME-STAMPED</strong>
						<small>Every event has context</small>
					</div>
				</div>
				<div className="audit-summary-card">
					<span className="audit-summary-icon audit-icon-purple">
						<UserRound size={17} />
					</span>
					<div>
						<strong>ACCOUNTABILITY</strong>
						<small>Actor and resource tracked</small>
					</div>
				</div>
			</section>

			<section className="panel audit-panel">
				<div className="audit-toolbar">
					<div className="audit-search">
						<Search size={16} />
						<input
							aria-label="Search audit activity"
							placeholder="Search events, actions, resources…"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") applySearch();
							}}
						/>
						<button type="button" onClick={applySearch}>
							Search
						</button>
					</div>
					<div className="audit-filters">
						<select
							aria-label="Filter by category"
							value={filters.category}
							onChange={(event) => updateFilter("category", event.target.value)}
						>
							<option value="">All categories</option>
							{categories.map((category) => (
								<option key={category}>{category}</option>
							))}
						</select>
						<select
							aria-label="Filter by status"
							value={filters.status}
							onChange={(event) => updateFilter("status", event.target.value)}
						>
							<option value="">Any status</option>
							{statuses.map((status) => (
								<option key={status}>{status}</option>
							))}
						</select>
						<input
							aria-label="Filter by action"
							placeholder="Action"
							value={filters.action}
							onChange={(event) => updateFilter("action", event.target.value)}
						/>
						<input
							aria-label="Filter by user ID"
							placeholder="User ID"
							value={filters.userId}
							onChange={(event) => updateFilter("userId", event.target.value)}
						/>
						<input
							aria-label="Filter by resource type"
							placeholder="Resource type"
							value={filters.resourceType}
							onChange={(event) =>
								updateFilter("resourceType", event.target.value)
							}
						/>
						<input
							aria-label="Filter by resource ID"
							placeholder="Resource ID"
							value={filters.resourceId}
							onChange={(event) =>
								updateFilter("resourceId", event.target.value)
							}
						/>
						<input
							aria-label="Filter from date"
							type="date"
							value={filters.from}
							onChange={(event) => updateFilter("from", event.target.value)}
						/>
						<input
							aria-label="Filter to date"
							type="date"
							value={filters.to}
							onChange={(event) => updateFilter("to", event.target.value)}
						/>
						<button
							className="icon-button reset-filters"
							type="button"
							aria-label="Reset filters"
							title="Reset filters"
							onClick={resetFilters}
						>
							<FilterX size={16} />
						</button>
					</div>
				</div>
				{loading ? (
					<LoadingBlock label="Loading the audit trail" />
				) : events.length ? (
					<>
						<div className="audit-table-scroll">
							<table className="audit-table">
								<thead>
									<tr>
										<th>ACTIVITY</th>
										<th>ACTOR</th>
										<th>RESOURCE</th>
										<th>STATUS</th>
										<th>WHEN</th>
									</tr>
								</thead>
								<tbody>
									{events.map((event) => (
										<tr
											key={event.id}
											onClick={() => setSelected(event)}
											tabIndex={0}
											onKeyDown={(keyboard) => {
												if (keyboard.key === "Enter") setSelected(event);
											}}
										>
											<td>
												<div className="audit-action-cell">
													<span className="audit-event-icon">
														<ShieldCheck size={15} />
													</span>
													<span>
														<strong>{event.action.replaceAll("_", " ")}</strong>
														<small>
															{event.description ||
																event.category ||
																"Workspace event"}
														</small>
													</span>
												</div>
											</td>
											<td>
												<div className="audit-actor">
													{event.user ? (
														<>
															<strong>{event.user.name}</strong>
															<small>{event.user.email}</small>
														</>
													) : (
														<>
															<strong>System / unknown</strong>
															<small>
																{event.userId
																	? `User ${event.userId.slice(0, 8)}…`
																	: "Unauthenticated"}
															</small>
														</>
													)}
												</div>
											</td>
											<td>
												<div className="audit-resource">
													<strong>{event.resourceType || "—"}</strong>
													<small>
														{event.resourceId
															? `${event.resourceId.slice(0, 14)}${event.resourceId.length > 14 ? "…" : ""}`
															: "No resource ID"}
													</small>
												</div>
											</td>
											<td>
												<StatusPill status={event.status} />
											</td>
											<td>
												<div className="audit-time">
													<CalendarDays size={13} />
													<span>{dateLabel(event.createdAt)}</span>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="pagination-bar">
							<span>
								Showing{" "}
								<strong>
									{meta.total ? (page - 1) * meta.limit + 1 : 0}–
									{Math.min(page * meta.limit, meta.total)}
								</strong>{" "}
								of <strong>{meta.total}</strong> events
							</span>
							<div>
								<button
									className="pagination-button"
									type="button"
									disabled={page <= 1}
									onClick={() => setPage((current) => Math.max(current - 1, 1))}
								>
									<ChevronLeft size={15} /> Previous
								</button>
								<span className="pagination-page">
									{page} / {Math.max(meta.totalPages, 1)}
								</span>
								<button
									className="pagination-button"
									type="button"
									disabled={page >= meta.totalPages}
									onClick={() => setPage((current) => current + 1)}
								>
									Next <ChevronRight size={15} />
								</button>
							</div>
						</div>
					</>
				) : (
					<EmptyState
						title="Nothing in the log for these filters"
						description="Try widening your date range or clear the active filters."
						action={
							<button
								className="button button-secondary"
								type="button"
								onClick={resetFilters}
							>
								<FilterX size={14} /> Clear filters
							</button>
						}
					/>
				)}
			</section>

			<div className="audit-note">
				<span>
					<ShieldCheck size={14} />
				</span>
				<p>
					Sensitive values such as passwords, tokens, and API keys are excluded
					from audit metadata. This log is visible to workspace administrators
					only.
				</p>
			</div>
			{selected && (
				<Modal
					title="Audit event details"
					description={dateLabel(selected.createdAt)}
					onClose={() => setSelected(null)}
				>
					<div className="audit-detail-grid">
						<span>Action</span>
						<strong>{selected.action}</strong>
						<span>Category</span>
						<strong>{selected.category ?? "—"}</strong>
						<span>Status</span>
						<strong>
							<StatusPill status={selected.status} />
						</strong>
						<span>Actor</span>
						<strong>
							{selected.user?.email ?? selected.userId ?? "Unauthenticated"}
						</strong>
						<span>Resource</span>
						<strong>
							{selected.resourceType ?? "—"}
							{selected.resourceId ? ` · ${selected.resourceId}` : ""}
						</strong>
						<span>IP address</span>
						<strong>{selected.ipAddress ?? "Not recorded"}</strong>
						<span>User agent</span>
						<strong className="audit-agent">
							{selected.userAgent ?? "Not recorded"}
						</strong>
					</div>
					<div className="audit-json-heading">SAFE EVENT METADATA</div>
					<pre className="audit-json">
						<code>{JSON.stringify(selected.metadata ?? {}, null, 2)}</code>
					</pre>
				</Modal>
			)}
		</>
	);
}
