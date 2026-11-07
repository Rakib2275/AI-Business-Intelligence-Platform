"use client";

import type { ChartConfiguration } from "@/lib/types";

const chartColors = ["#58a77d", "#6d8fe8", "#e7a548", "#c66ea8", "#50a9b5"];

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
	const columns = Object.keys(rows[0] ?? {});
	if (configuration.type === "KPI_CARDS") {
		const metrics = configuration.series.flatMap((column) => {
			const value = numberValue(rows[0]?.[column]);
			return value === null ? [] : [{ column, value }];
		});
		if (!metrics.length) {
			return <ResultTable rows={rows} columns={columns} compact />;
		}
		return (
			<div className="kpi-card-grid">
				{metrics.map(({ column, value }) => (
					<div className="kpi-card" key={column}>
						<span>{column}</span>
						<strong>{formatValue(value)}</strong>
					</div>
				))}
			</div>
		);
	}

	const xAxis = configuration.xAxis;
	if (!xAxis || !configuration.series.length || rows.length < 2) {
		return <ResultTable rows={rows} columns={columns} compact />;
	}

	const chartSeries = configuration.series
		.map((name, seriesIndex) => ({
			name,
			color: chartColors[seriesIndex % chartColors.length],
			points: rows
				.map((row, index) => {
					const value = numberValue(row[name]);
					if (value === null) return null;
					return {
						index,
						value,
						label: String(row[xAxis] ?? ""),
						key: `${name}:${index}`,
					};
				})
				.filter((point) => point !== null)
				.slice(0, 20),
		}))
		.filter((series) => series.points.length > 0);

	if (!chartSeries.length) {
		return <ResultTable rows={rows} columns={columns} compact />;
	}

	if (configuration.type === "PIE_CHART") {
		const points = chartSeries[0].points.filter(({ value }) => value > 0);
		const total = points.reduce((sum, point) => sum + point.value, 0);
		if (!total) return <ResultTable rows={rows} columns={columns} compact />;

		let angle = -Math.PI / 2;
		const slices = points.map((point, index) => {
			const portion = point.value / total;
			const endAngle = angle + portion * Math.PI * 2;
			const start = {
				x: 150 + 58 * Math.cos(angle),
				y: 70 + 58 * Math.sin(angle),
			};
			const end = {
				x: 150 + 58 * Math.cos(endAngle),
				y: 70 + 58 * Math.sin(endAngle),
			};
			const path =
				portion >= 1
					? ""
					: `M 150 70 L ${start.x} ${start.y} A 58 58 0 ${portion > 0.5 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
			const slice = {
				...point,
				path,
				color: chartColors[index % chartColors.length],
				percentage: portion * 100,
			};
			angle = endAngle;
			return slice;
		});

		return (
			<div className="chart-preview chart-preview-pie">
				<svg
					viewBox="0 0 300 140"
					role="img"
					aria-label={`${chartSeries[0].name} share by ${xAxis}`}
				>
					{points.length === 1 ? (
						<circle cx="150" cy="70" r="58" fill={chartColors[0]} />
					) : (
						slices.map((slice) => (
							<path
								key={slice.key}
								d={slice.path}
								fill={slice.color}
								stroke="white"
								strokeWidth="1.5"
							/>
						))
					)}
				</svg>
				<ul className="chart-pie-legend">
					{slices.map((slice) => (
						<li key={slice.key}>
							<span style={{ backgroundColor: slice.color }} />
							<strong>{slice.label}</strong>
							<small>
								{new Intl.NumberFormat(undefined, {
									maximumFractionDigits: 1,
								}).format(slice.percentage)}
								%
							</small>
						</li>
					))}
				</ul>
			</div>
		);
	}

	const visiblePoints = chartSeries.flatMap((series) => series.points);
	const values = visiblePoints.map(({ value }) => value);
	const min = Math.min(0, ...values);
	const max = Math.max(0, ...values);
	const range = max - min || 1;
	const yAt = (value: number) => 94 - ((value - min) / range) * 76;
	const zeroY = yAt(0);
	const visibleRowCount = Math.min(rows.length, 20);
	const xAt = (index: number) =>
		24 + ((index + 0.5) / visibleRowCount) * 252;

	return (
		<div className="chart-preview">
			<div className="chart-legend">
				{chartSeries.map((series) => (
					<span className="chart-legend-item" key={series.name}>
						<i style={{ backgroundColor: series.color }} />
						<strong>{series.name}</strong>
					</span>
				))}
				<small>
					{configuration.type === "LINE_CHART" ? "Trend" : "By category"}
				</small>
			</div>
			<svg
				viewBox="0 0 300 120"
				role="img"
				aria-label={`${chartSeries.map((series) => series.name).join(", ")} by ${xAxis} chart`}
			>
				<path
					d="M 10 95 H 290 M 10 56 H 290 M 10 18 H 290"
					className="chart-gridline"
				/>
				{configuration.type === "BAR_CHART" ? (
					chartSeries.flatMap((series, seriesIndex) => {
						const groupWidth = 252 / visibleRowCount;
						const barWidth = Math.min(
							16,
							(groupWidth * 0.8) / chartSeries.length,
						);
						return series.points.map((point) => {
							const center = xAt(point.index);
							const y = yAt(point.value);
							return (
								<rect
									key={point.key}
									x={
										center -
										(chartSeries.length * barWidth) / 2 +
										seriesIndex * barWidth
									}
									y={Math.min(y, zeroY)}
									width={barWidth}
									height={Math.max(Math.abs(zeroY - y), 2)}
									rx="2"
									fill={series.color}
								/>
							);
						});
					})
				) : (
					chartSeries.map((series) => {
						const line = series.points
							.map((point, index) => {
								const command = index ? "L" : "M";
								return `${command} ${xAt(point.index)} ${yAt(point.value)}`;
							})
							.join(" ");
						return (
							<g key={series.name}>
								<path
									d={line}
									className="chart-line"
									stroke={series.color}
								/>
								{series.points.map((point) => (
									<circle
										key={point.key}
										cx={xAt(point.index)}
										cy={yAt(point.value)}
										r="3.5"
										className="chart-point"
										stroke={series.color}
									/>
								))}
							</g>
						);
					})
				)}
			</svg>
			<div className="chart-labels">
				<span>{chartSeries[0].points[0]?.label}</span>
				<span>{chartSeries[0].points.at(-1)?.label}</span>
			</div>
		</div>
	);
}
