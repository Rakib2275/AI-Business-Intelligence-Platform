"use client";

import type { ChartConfiguration } from "@/lib/types";

const numberValue = (value: unknown) => {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string" || !value.trim()) return null;
	const numeric = Number(value.replaceAll(",", ""));
	return Number.isFinite(numeric) ? numeric : null;
};

const formatValue = (value: unknown) =>
	typeof value === "number"
		? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
				value,
			)
		: String(value ?? "—");

export function ResultTable({
	rows,
	columns,
	compact = false,
}: {
	rows: Array<Record<string, unknown>>;
	columns: string[];
	compact?: boolean;
}) {
	if (!rows.length || !columns.length) {
		return <div className="result-no-rows">The query returned no rows.</div>;
	}
	const rowOccurrences = new Map<string, number>();
	const visibleRows = rows.slice(0, compact ? 5 : 20).map((row) => {
		const signature = JSON.stringify(row) ?? "";
		const occurrence = rowOccurrences.get(signature) ?? 0;
		rowOccurrences.set(signature, occurrence + 1);
		return { row, key: `${signature}:${occurrence}` };
	});
	return (
		<div
			className={`result-table-wrap ${compact ? "result-table-compact" : ""}`}
		>
			<table className="result-table">
				<thead>
					<tr>
						{columns.map((column) => (
							<th key={column}>{column}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{visibleRows.map(({ row, key }) => (
						<tr key={key}>
							{columns.map((column) => (
								<td key={column}>{formatValue(row[column])}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{rows.length > (compact ? 5 : 20) && (
				<div className="table-overflow-note">
					Showing {compact ? 5 : 20} of {rows.length} rows
				</div>
			)}
		</div>
	);
}

export function ResultChart({
	rows,
	configuration,
}: {
	rows: Array<Record<string, unknown>>;
	configuration: ChartConfiguration;
}) {
	const xAxis = configuration.xAxis;
	const series = configuration.series[0];
	if (!xAxis || !series || rows.length < 2) {
		return (
			<ResultTable rows={rows} columns={Object.keys(rows[0] ?? {})} compact />
		);
	}
	const pointOccurrences = new Map<string, number>();
	const points = rows
		.flatMap((row, index) => {
			const value = numberValue(row[series]);
			if (value === null) return [];
			const label = String(row[xAxis] ?? "");
			const signature = JSON.stringify([label, value]) ?? "";
			const occurrence = pointOccurrences.get(signature) ?? 0;
			pointOccurrences.set(signature, occurrence + 1);
			return [
				{
					index,
					value,
					label,
					key: `${signature}:${occurrence}`,
				},
			];
		})
		.slice(0, 20);
	if (points.length < 2)
		return (
			<ResultTable rows={rows} columns={Object.keys(rows[0] ?? {})} compact />
		);

	const values = points.map(({ value }) => value);
	const min = Math.min(0, ...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const xAt = (index: number) =>
		12 + (index / Math.max(points.length - 1, 1)) * 276;
	const yAt = (value: number) => 94 - ((value - min) / range) * 76;
	const line = points
		.map(
			(point, index) =>
				`${index ? "L" : "M"} ${xAt(index)} ${yAt(point.value)}`,
		)
		.join(" ");

	return (
		<div className="chart-preview">
			<div className="chart-legend">
				<span />
				<strong>{series}</strong>
				<small>
					{configuration.type === "LINE_CHART" ? "Trend" : "By category"}
				</small>
			</div>
			<svg
				viewBox="0 0 300 120"
				role="img"
				aria-label={`${series} by ${xAxis} chart`}
			>
				<path
					d="M 10 95 H 290 M 10 56 H 290 M 10 18 H 290"
					className="chart-gridline"
				/>
				{configuration.type === "BAR_CHART" ? (
					points.map((point, index) => {
						const width = Math.min(15, 180 / points.length);
						return (
							<rect
								key={point.key}
								x={xAt(index) - width / 2}
								y={yAt(point.value)}
								width={width}
								height={Math.max(95 - yAt(point.value), 2)}
								rx="3"
								className="chart-bar"
							/>
						);
					})
				) : (
					<>
						<path d={line} className="chart-line" />
						<path
							d={`${line} L ${xAt(points.length - 1)} 95 L ${xAt(0)} 95 Z`}
							className="chart-area"
						/>
						{points.map((point, index) => (
							<circle
								key={point.key}
								cx={xAt(index)}
								cy={yAt(point.value)}
								r="3.5"
								className="chart-point"
							/>
						))}
					</>
				)}
			</svg>
			<div className="chart-labels">
				<span>{points[0]?.label}</span>
				<span>{points.at(-1)?.label}</span>
			</div>
		</div>
	);
}
