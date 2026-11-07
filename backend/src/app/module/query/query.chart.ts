type QueryRow = Record<string, unknown>;

export type ChartConfiguration = {
	type: "TABLE" | "BAR_CHART" | "LINE_CHART" | "PIE_CHART" | "KPI_CARDS";
	xAxis?: string;
	series: string[];
};

const isNumericValue = (value: unknown) => {
	if (typeof value === "number") return Number.isFinite(value);
	if (typeof value !== "string" || !value.trim()) return false;
	return Number.isFinite(Number(value.replaceAll(",", "")));
};

export const parseChartConfiguration = (
	value: unknown,
	rows: QueryRow[],
): ChartConfiguration | undefined => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	const configuration = value as Record<string, unknown>;
	const type = configuration.type;
	if (
		type !== "TABLE" &&
		type !== "BAR_CHART" &&
		type !== "LINE_CHART" &&
		type !== "PIE_CHART" &&
		type !== "KPI_CARDS"
	) {
		return;
	}
	if (
		!Array.isArray(configuration.series) ||
		configuration.series.some((column) => typeof column !== "string")
	) {
		return;
	}
	const series = configuration.series.filter(
		(column): column is string => typeof column === "string",
	);
	if (type === "TABLE") {
		return series.length === 0
			? { type, series: [] }
			: undefined;
	}
	if (!rows.length || !series.length) return;

	const columns = new Set(Object.keys(rows[0]));
	const numericSeries = series.every(
		(column) =>
			columns.has(column) &&
			rows.some((row) => row[column] !== null && row[column] !== undefined) &&
			rows.every(
				(row) =>
					row[column] === null ||
					row[column] === undefined ||
					isNumericValue(row[column]),
			),
	);
	if (!numericSeries) return;

	if (type === "KPI_CARDS") {
		return configuration.xAxis === undefined || configuration.xAxis === null
			? { type, series }
			: undefined;
	}

	const xAxis = configuration.xAxis;
	if (typeof xAxis !== "string" || !columns.has(xAxis)) return;
	if (series.includes(xAxis)) return;
	return { type, xAxis, series };
};

export const suggestChartConfiguration = (
	rows: QueryRow[],
): ChartConfiguration => {
	const firstRow = rows[0];
	if (!firstRow) return { type: "TABLE", series: [] };

	const columns = Object.keys(firstRow);
	const numericColumns = columns.filter((column) => {
		const values = rows
			.map((row) => row[column])
			.filter((value) => value !== null && value !== undefined);
		return values.length > 0 && values.every(isNumericValue);
	});
	const xAxis = columns.find((column) => !numericColumns.includes(column));

	if (!numericColumns.length || !xAxis) {
		return { type: "TABLE", series: [] };
	}

	return {
		type: /date|time|month|year/i.test(xAxis) ? "LINE_CHART" : "BAR_CHART",
		xAxis,
		series: numericColumns,
	};
};
