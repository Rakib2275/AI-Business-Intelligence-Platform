type QueryRow = Record<string, unknown>;

export type ChartConfiguration = {
	type: "TABLE" | "BAR_CHART" | "LINE_CHART";
	xAxis?: string;
	series: string[];
};

const isNumericValue = (value: unknown) => {
	if (typeof value === "number") return Number.isFinite(value);
	if (typeof value !== "string" || !value.trim()) return false;
	return Number.isFinite(Number(value.replaceAll(",", "")));
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
