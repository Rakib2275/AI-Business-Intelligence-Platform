export type DataRow = Record<string, unknown>;

const toFiniteNumber = (value: unknown) => {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string" || !value.trim()) return null;
	const parsed = Number(value.replaceAll(",", ""));
	return Number.isFinite(parsed) ? parsed : null;
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
		throw new Error(
			"At least four numeric values are required for anomaly detection.",
		);
	}

	const sorted = values
		.map(({ value }) => value)
		.sort((left, right) => left - right);
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
