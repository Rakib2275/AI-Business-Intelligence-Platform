export type DataRow = Record<string, unknown>;

export type ForecastPoint = {
	date: string;
	value: number;
};

const toFiniteNumber = (value: unknown) => {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string" || !value.trim()) return null;
	const parsed = Number(value.replaceAll(",", ""));
	return Number.isFinite(parsed) ? parsed : null;
};

export const calculateForecast = (
	rows: DataRow[],
	dateColumn: string,
	valueColumn: string,
	periods: number,
) => {
	const points = rows.flatMap((row) => {
		const date = new Date(String(row[dateColumn] ?? ""));
		const value = toFiniteNumber(row[valueColumn]);
		return !Number.isNaN(date.getTime()) && value !== null ? [{ date, value }] : [];
	}).sort((left, right) => left.date.getTime() - right.date.getTime());

	if (points.length < 3) {
		throw new Error("At least three valid date/value rows are required for forecasting.");
	}

	const xMean = (points.length - 1) / 2;
	const yMean = points.reduce((total, point) => total + point.value, 0) / points.length;
	const numerator = points.reduce(
		(total, point, index) => total + (index - xMean) * (point.value - yMean),
		0,
	);
	const denominator = points.reduce((total, _point, index) => total + (index - xMean) ** 2, 0);
	const slope = numerator / denominator;
	const intercept = yMean - slope * xMean;
	const intervals = points.slice(1).map(
		(point, index) => point.date.getTime() - points[index].date.getTime(),
	).filter((interval) => interval > 0).sort((left, right) => left - right);
	const interval = intervals.length
		? intervals[Math.floor(intervals.length / 2)]
		: 86_400_000;
	const lastDate = points.at(-1)?.date;
	if (!lastDate) throw new Error("No forecast dates found.");

	const forecast: ForecastPoint[] = Array.from({ length: periods }, (_, index) => ({
		date: new Date(lastDate.getTime() + interval * (index + 1)).toISOString(),
		value: Math.max(0, intercept + slope * (points.length + index)),
	}));
	return {
		observations: points,
		forecast,
		trendPerPeriod: slope,
		method: "linear regression",
	};
};

const quantile = (sortedValues: number[], probability: number) => {
	const position = (sortedValues.length - 1) * probability;
	const lowerIndex = Math.floor(position);
	const fraction = position - lowerIndex;
	const lower = sortedValues[lowerIndex];
	const upper = sortedValues[Math.min(lowerIndex + 1, sortedValues.length - 1)];
	return lower + fraction * (upper - lower);
};

export const findAnomalies = (rows: DataRow[], valueColumn: string) => {
	const values = rows.flatMap((row, index) => {
		const value = toFiniteNumber(row[valueColumn]);
		return value === null ? [] : [{ rowIndex: index, value }];
	});
	if (values.length < 4) {
		throw new Error("At least four numeric values are required for anomaly detection.");
	}

	const sorted = values.map(({ value }) => value).sort((left, right) => left - right);
	const q1 = quantile(sorted, 0.25);
	const q3 = quantile(sorted, 0.75);
	const spread = q3 - q1;
	const lowerBound = q1 - 1.5 * spread;
	const upperBound = q3 + 1.5 * spread;
	const anomalies = values
		.filter(({ value }) => value < lowerBound || value > upperBound)
		.map(({ rowIndex, value }) => ({ rowIndex, value }));

	return { count: values.length, q1, q3, lowerBound, upperBound, anomalies };
};