"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type FormEvent,
} from "react";
import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	BarChart3,
	Check,
	ChevronDown,
	Database,
	Grid2X2,
	Pencil,
	Plus,
	RefreshCw,
	Save,
	Trash2,
} from "lucide-react";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api";
import type {
	Dashboard,
	DashboardWidget,
	QueryRecord,
	RefreshedWidgetData,
} from "@/lib/types";
import { ResultChart, ResultTable } from "@/components/result-visual";
import {
	EmptyState,
	ErrorNotice,
	LoadingBlock,
	Modal,
	PageHeading,
	StatusPill,
} from "@/components/ui";

const widgetTypes = [
	"KPI",
	"TABLE",
	"BAR_CHART",
	"LINE_CHART",
	"PIE_CHART",
	"AREA_CHART",
	"SCATTER",
	"METRIC",
	"TEXT",
	"INSIGHT",
];

export default function DashboardDetailPage() {
	const params = useParams<{ id: string }>();
	const id = params.id;
	const [dashboard, setDashboard] = useState<Dashboard | null>(null);
	const [queries, setQueries] = useState<QueryRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editingName, setEditingName] = useState(false);
	const [nameDraft, setNameDraft] = useState("");
	const [showWidget, setShowWidget] = useState(false);
	const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(
		null,
	);
	const [editTitle, setEditTitle] = useState("");
	const [editType, setEditType] = useState("TABLE");
	const [editConfigText, setEditConfigText] = useState("{}");
	const [widgetTitle, setWidgetTitle] = useState("");
	const [widgetType, setWidgetType] = useState("TABLE");
	const [queryId, setQueryId] = useState("");
	const [configText, setConfigText] = useState("{}");
	const [saving, setSaving] = useState(false);
	const [busyWidget, setBusyWidget] = useState("");
	const [refreshes, setRefreshes] = useState<
		Record<string, RefreshedWidgetData>
	>({});

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError("");
		try {
			const [dashboardResponse, queryResponse] = await Promise.all([
				apiRequest<Dashboard>(`/dashboards/${id}`),
				apiRequest<QueryRecord[]>("/query/history"),
			]);
			setDashboard(dashboardResponse.data);
			setNameDraft(dashboardResponse.data.name);
			setQueries(
				queryResponse.data.filter((query) => query.status === "SUCCESS"),
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Dashboard could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	const updateName = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!dashboard || !nameDraft.trim()) return;
		setSaving(true);
		try {
			const response = await jsonRequest<Dashboard>(
				`/dashboards/${id}`,
				"PATCH",
				{ name: nameDraft.trim() },
			);
			setDashboard((current) =>
				current ? { ...current, ...response.data } : current,
			);
			setEditingName(false);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Dashboard name could not be saved.",
			);
		} finally {
			setSaving(false);
		}
	};

	const createWidget = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!dashboard) return;
		let configuration: Record<string, unknown>;
		try {
			const parsed: unknown = JSON.parse(configText);
			if (
				typeof parsed !== "object" ||
				parsed === null ||
				Array.isArray(parsed)
			)
				throw new Error("Configuration must be a JSON object.");
			configuration = parsed as Record<string, unknown>;
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Widget configuration is not valid JSON.",
			);
			return;
		}
		setSaving(true);
		setError("");
		try {
			await jsonRequest<DashboardWidget>(`/dashboards/${id}/widgets`, "POST", {
				title: widgetTitle,
				type: widgetType,
				...(queryId ? { queryId } : {}),
				position: dashboard.widgets?.length ?? 0,
				configuration,
			});
			setShowWidget(false);
			setWidgetTitle("");
			setQueryId("");
			setConfigText("{}");
			await load();
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Widget could not be saved.",
			);
		} finally {
			setSaving(false);
		}
	};

	const refreshWidget = async (widget: DashboardWidget) => {
		setBusyWidget(widget.id);
		setError("");
		try {
			const response = await apiRequest<
				RefreshedWidgetData & { widget: DashboardWidget }
			>(`/dashboards/${id}/widgets/${widget.id}/refresh`, { method: "POST" });
			setRefreshes((current) => ({ ...current, [widget.id]: response.data }));
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Widget data could not be refreshed.",
			);
		} finally {
			setBusyWidget("");
		}
	};

	const deleteWidget = async (widget: DashboardWidget) => {
		if (!window.confirm(`Delete the “${widget.title}” widget?`)) return;
		try {
			await apiRequest<null>(`/dashboards/${id}/widgets/${widget.id}`, {
				method: "DELETE",
			});
			setDashboard((current) =>
				current
					? {
							...current,
							widgets: current.widgets?.filter((item) => item.id !== widget.id),
						}
					: current,
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Widget could not be deleted.",
			);
		}
	};

	const openWidgetEditor = (widget: DashboardWidget) => {
		setEditingWidget(widget);
		setEditTitle(widget.title);
		setEditType(widget.type);
		setEditConfigText(JSON.stringify(widget.configuration ?? {}, null, 2));
	};

	const saveWidget = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!editingWidget) return;
		let configuration: Record<string, unknown>;
		try {
			const parsed: unknown = JSON.parse(editConfigText);
			if (
				typeof parsed !== "object" ||
				parsed === null ||
				Array.isArray(parsed)
			)
				throw new Error("Configuration must be a JSON object.");
			configuration = parsed as Record<string, unknown>;
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Widget configuration is not valid JSON.",
			);
			return;
		}
		setSaving(true);
		setError("");
		try {
			const response = await jsonRequest<DashboardWidget>(
				`/dashboards/${id}/widgets/${editingWidget.id}`,
				"PATCH",
				{
					title: editTitle.trim(),
					type: editType,
					configuration,
				},
			);
			setDashboard((current) =>
				current
					? {
							...current,
							widgets: current.widgets?.map((item) =>
								item.id === editingWidget.id
									? { ...item, ...response.data }
									: item,
							),
						}
					: current,
			);
			setEditingWidget(null);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Widget could not be updated.",
			);
		} finally {
			setSaving(false);
		}
	};

	const moveWidget = async (widget: DashboardWidget, direction: -1 | 1) => {
		const currentIndex = sortedWidgets.findIndex(
			(item) => item.id === widget.id,
		);
		const targetIndex = currentIndex + direction;
		if (targetIndex < 0 || targetIndex >= sortedWidgets.length) return;
		const reordered = [...sortedWidgets];
		const currentWidget = reordered[currentIndex];
		const targetWidget = reordered[targetIndex];
		if (!currentWidget || !targetWidget) return;
		reordered[currentIndex] = targetWidget;
		reordered[targetIndex] = currentWidget;
		try {
			const response = await jsonRequest<DashboardWidget[]>(
				`/dashboards/${id}/widgets/reorder`,
				"PATCH",
				{
					widgets: reordered.map((item, position) => ({
						id: item.id,
						position,
					})),
				},
			);
			setDashboard((current) =>
				current ? { ...current, widgets: response.data } : current,
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Widgets could not be reordered.",
			);
		}
	};

	const sortedWidgets = useMemo(
		() =>
			[...(dashboard?.widgets ?? [])].sort(
				(left, right) => left.position - right.position,
			),
		[dashboard?.widgets],
	);

	if (loading)
		return (
			<div className="panel">
				<LoadingBlock label="Opening dashboard" />
			</div>
		);
	if (error && !dashboard)
		return <ErrorNotice message={error} onRetry={() => void load()} />;
	if (!dashboard) return null;

	return (
		<>
			<Link href="/dashboards" className="back-link">
				<ArrowLeft size={15} /> All dashboards
			</Link>
			<PageHeading
				eyebrow="DASHBOARD · PRIVATE TO YOU"
				title={dashboard.name}
				description={
					dashboard.description ||
					"A living view of the questions and metrics you care about."
				}
				action={
					<button
						className="button button-primary"
						type="button"
						onClick={() => setShowWidget(true)}
					>
						<Plus size={16} /> Add widget
					</button>
				}
			/>
			{error && <ErrorNotice message={error} />}
			<div className="dashboard-detail-meta">
				<span>
					<Grid2X2 size={14} /> {sortedWidgets.length} widget
					{sortedWidgets.length === 1 ? "" : "s"}
				</span>
				<span>
					<Check size={13} /> Read-only data sources
				</span>
				<button
					className="text-button"
					type="button"
					onClick={() => setEditingName((current) => !current)}
				>
					<Save size={13} /> Rename dashboard
				</button>
			</div>
			{editingName && (
				<form className="rename-form" onSubmit={updateName}>
					<input
						aria-label="Dashboard name"
						value={nameDraft}
						onChange={(event) => setNameDraft(event.target.value)}
						maxLength={120}
					/>
					<button
						className="button button-primary button-small"
						type="submit"
						disabled={saving}
					>
						{saving ? "Saving…" : "Save name"}
					</button>
					<button
						className="button button-quiet button-small"
						type="button"
						onClick={() => {
							setNameDraft(dashboard.name);
							setEditingName(false);
						}}
					>
						Cancel
					</button>
				</form>
			)}
			{sortedWidgets.length ? (
				<section className="widget-grid">
					{sortedWidgets.map((widget, index) => {
						const refreshed = refreshes[widget.id];
						const chart = refreshed?.chartConfiguration;
						return (
							<article
								className={`widget-card ${widget.type === "TEXT" || widget.type === "INSIGHT" ? "widget-card-wide" : ""}`}
								key={widget.id}
							>
								<header className="widget-header">
									<div className="widget-title-icon">
										<BarChart3 size={15} />
									</div>
									<div className="widget-heading-copy">
										<strong>{widget.title}</strong>
										<small>
											{widget.query?.question ??
												widget.type.replaceAll("_", " ")}
										</small>
									</div>
									<div className="widget-menu-actions">
										<button
											type="button"
											className="icon-button"
											title="Move earlier"
											aria-label="Move widget up"
											disabled={index === 0}
											onClick={() => void moveWidget(widget, -1)}
										>
											<ArrowUp size={14} />
										</button>
										<button
											type="button"
											className="icon-button"
											title="Move later"
											aria-label="Move widget down"
											disabled={index === sortedWidgets.length - 1}
											onClick={() => void moveWidget(widget, 1)}
										>
											<ArrowDown size={14} />
										</button>
										<button
											type="button"
											className="icon-button"
											title="Edit widget"
											aria-label={`Edit ${widget.title}`}
											onClick={() => openWidgetEditor(widget)}
										>
											<Pencil size={13} />
										</button>
										<button
											type="button"
											className="icon-button widget-delete"
											title="Delete widget"
											aria-label={`Delete ${widget.title}`}
											onClick={() => void deleteWidget(widget)}
										>
											<Trash2 size={14} />
										</button>
									</div>
								</header>
								<div className="widget-content">
									{refreshed ? (
										<>
											{refreshed.summary && (
												<p className="widget-summary">{refreshed.summary}</p>
											)}
											{chart?.type !== "TABLE" ? (
												<ResultChart
													rows={refreshed.rows}
													configuration={chart ?? { type: "TABLE", series: [] }}
												/>
											) : (
												<ResultTable
													rows={refreshed.rows}
													columns={refreshed.columns}
													compact
												/>
											)}
										</>
									) : widget.query ? (
										<div className="widget-unrefreshed">
											<div className="widget-mini-chart">
												<i />
												<i />
												<i />
												<i />
												<i />
												<i />
												<i />
												<i />
											</div>
											<p>
												Saved query is ready to refresh against the latest data.
											</p>
										</div>
									) : widget.configuration?.text ? (
										<p className="widget-text">
											{String(widget.configuration.text)}
										</p>
									) : (
										<EmptyState
											title="Connect a saved query"
											description="Refresh a successful query to show its current result here."
										/>
									)}
								</div>
								<footer className="widget-footer">
									<span>
										{widget.query ? (
											<>
												<StatusPill status={widget.query.status} /> · Saved
												query
											</>
										) : (
											"No saved query attached"
										)}
									</span>
									<button
										type="button"
										className="widget-refresh"
										onClick={() => void refreshWidget(widget)}
										disabled={!widget.queryId || busyWidget === widget.id}
									>
										{busyWidget === widget.id ? (
											<span className="button-spinner" />
										) : (
											<RefreshCw size={13} />
										)}{" "}
										Refresh data
									</button>
								</footer>
							</article>
						);
					})}
					<button
						className="widget-add-card"
						type="button"
						onClick={() => setShowWidget(true)}
					>
						<span>
							<Plus size={20} />
						</span>
						<strong>Add another insight</strong>
						<small>Attach a successful query as a widget</small>
					</button>
				</section>
			) : (
				<div className="panel panel-empty">
					<EmptyState
						title="This dashboard is ready for its first insight"
						description="Choose a successful query and turn its result into a live, refreshable widget."
						action={
							<button
								className="button button-primary"
								type="button"
								onClick={() => setShowWidget(true)}
							>
								<Plus size={15} /> Add your first widget
							</button>
						}
					/>
				</div>
			)}

			{showWidget && (
				<Modal
					title="Add a dashboard widget"
					description="Save a visualization and optionally attach one of your successful queries."
					onClose={() => setShowWidget(false)}
				>
					<form className="stack-form" onSubmit={createWidget}>
						<label htmlFor="widget-title">Widget title</label>
						<input
							id="widget-title"
							value={widgetTitle}
							onChange={(event) => setWidgetTitle(event.target.value)}
							placeholder="e.g. Monthly revenue"
							maxLength={120}
							required
						/>
						<label htmlFor="widget-type">Visualization</label>
						<div className="select-wrap">
							<select
								id="widget-type"
								value={widgetType}
								onChange={(event) => setWidgetType(event.target.value)}
							>
								{widgetTypes.map((type) => (
									<option key={type} value={type}>
										{type.replaceAll("_", " ")}
									</option>
								))}
							</select>
							<ChevronDown size={15} />
						</div>
						<label htmlFor="widget-query">
							Successful query <span className="optional-label">OPTIONAL</span>
						</label>
						<div className="select-wrap">
							<select
								id="widget-query"
								value={queryId}
								onChange={(event) => setQueryId(event.target.value)}
							>
								<option value="">No query attached</option>
								{queries.map((query) => (
									<option key={query.id} value={query.id}>
										{query.question.slice(0, 90)}
										{query.question.length > 90 ? "…" : ""}
									</option>
								))}
							</select>
							<ChevronDown size={15} />
						</div>
						<label htmlFor="widget-config">
							Visualization settings{" "}
							<span className="optional-label">JSON</span>
						</label>
						<textarea
							id="widget-config"
							className="config-input"
							value={configText}
							onChange={(event) => setConfigText(event.target.value)}
							rows={3}
							spellCheck={false}
						/>
						<div className="form-helper">
							<Database size={13} /> Only successful queries owned by you can be
							attached.
						</div>
						<div className="modal-actions">
							<button
								className="button button-quiet"
								type="button"
								onClick={() => setShowWidget(false)}
							>
								Cancel
							</button>
							<button
								className="button button-primary"
								type="submit"
								disabled={saving || !widgetTitle.trim()}
							>
								{saving ? "Saving…" : "Add widget"} <Plus size={15} />
							</button>
						</div>
					</form>
				</Modal>
			)}
			{editingWidget && (
				<Modal
					title="Edit dashboard widget"
					description="Update its title, visualization, or display settings."
					onClose={() => setEditingWidget(null)}
				>
					<form className="stack-form" onSubmit={saveWidget}>
						<label htmlFor="edit-widget-title">Widget title</label>
						<input
							id="edit-widget-title"
							value={editTitle}
							onChange={(event) => setEditTitle(event.target.value)}
							maxLength={120}
							required
						/>
						<label htmlFor="edit-widget-type">Visualization</label>
						<div className="select-wrap">
							<select
								id="edit-widget-type"
								value={editType}
								onChange={(event) => setEditType(event.target.value)}
							>
								{widgetTypes.map((type) => (
									<option key={type} value={type}>
										{type.replaceAll("_", " ")}
									</option>
								))}
							</select>
							<ChevronDown size={15} />
						</div>
						<label htmlFor="edit-widget-config">
							Visualization settings{" "}
							<span className="optional-label">JSON</span>
						</label>
						<textarea
							id="edit-widget-config"
							className="config-input"
							value={editConfigText}
							onChange={(event) => setEditConfigText(event.target.value)}
							rows={5}
							spellCheck={false}
						/>
						<div className="modal-actions">
							<button
								className="button button-quiet"
								type="button"
								onClick={() => setEditingWidget(null)}
							>
								Cancel
							</button>
							<button
								className="button button-primary"
								type="submit"
								disabled={saving || !editTitle.trim()}
							>
								{saving ? "Saving…" : "Save changes"} <Save size={14} />
							</button>
						</div>
					</form>
				</Modal>
			)}
		</>
	);
}
