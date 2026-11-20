"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Database, Sparkles } from "lucide-react";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api";
import type { Dataset } from "@/lib/types";
import { EmptyState, ErrorNotice, LoadingBlock, PageHeading } from "@/components/ui";

type DatasetColumn = {
	name: string;
	type: string;
	nullable: boolean;
};

type DatasetSchema = {
	id: string;
	name: string;
	updatedAt: string;
	columns: DatasetColumn[];
};

type TrainingResult = {
	datasetId: string;
	modelVersion: string;
	frequency: string;
	trainedAt: string;
	metrics: {
		mae: number;
		rmse: number;
		training_periods: number;
		validation_periods: number;
	};
};

type ForecastPoint = {
	date: string;
	value: number;
};

type ForecastResult = {
	observations: ForecastPoint[];
	forecast: ForecastPoint[];
	modelVersion: string;
	trainedAt: string;
	method: string;
	metrics: TrainingResult["metrics"];
};

export default function ForecastingPage() {
	const [datasets, setDatasets] = useState<Dataset[]>([]);
	const [datasetId, setDatasetId] = useState("");
	const [schema, setSchema] = useState<DatasetSchema | null>(null);
	const [dateColumn, setDateColumn] = useState("");
	const [valueColumn, setValueColumn] = useState("");
	const [periods, setPeriods] = useState(14);
	const [training, setTraining] = useState<TrainingResult | null>(null);
	const [forecast, setForecast] = useState<ForecastResult | null>(null);
	const [loadingDatasets, setLoadingDatasets] = useState(true);
	const [loadingSchema, setLoadingSchema] = useState(false);
	const [busy, setBusy] = useState<"train" | "predict" | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		apiRequest<Dataset[]>("/business-data")
			.then((response) => {
				if (!active) return;
				setDatasets(response.data);
				if (response.data[0]) setDatasetId(response.data[0].id);
			})
			.catch((caught: unknown) => {
				if (active) {
					setError(
						caught instanceof ApiError
							? caught.message
							: "Datasets could not be loaded.",
					);
				}
			})
			.finally(() => {
				if (active) setLoadingDatasets(false);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!datasetId) {
			setSchema(null);
			setDateColumn("");
			setValueColumn("");
			setTraining(null);
			setForecast(null);
			return;
		}

		let active = true;
		setLoadingSchema(true);
		setError("");
		setSchema(null);
		setTraining(null);
		setForecast(null);
		apiRequest<DatasetSchema>(`/business-data/${datasetId}/schema`)
			.then((response) => {
				if (!active) return;
				const datasetSchema = response.data;
				setSchema(datasetSchema);
				const dateColumns = datasetSchema.columns.filter(
					(column) =>
						column.type.toUpperCase() === "DATE" ||
						/date|time/i.test(column.name),
				);
				const numericColumns = datasetSchema.columns.filter((column) =>
					/number|numeric|integer|decimal|float|double/i.test(column.type),
				);
				setDateColumn(dateColumns[0]?.name ?? "");
				setValueColumn(numericColumns[0]?.name ?? "");
			})
			.catch((caught: unknown) => {
				if (active) {
					setError(
						caught instanceof ApiError
							? caught.message
							: "Dataset columns could not be loaded.",
					);
				}
			})
			.finally(() => {
				if (active) setLoadingSchema(false);
			});
		return () => {
			active = false;
		};
	}, [datasetId]);

	const dateColumns = useMemo(
		() =>
			schema?.columns.filter(
				(column) =>
					column.type.toUpperCase() === "DATE" ||
					/date|time/i.test(column.name),
			) ?? [],
		[schema],
	);
	const valueColumns = useMemo(
		() =>
			schema?.columns.filter((column) =>
				/number|numeric|integer|decimal|float|double/i.test(column.type),
			) ?? [],
		[schema],
	);

	const trainModel = async () => {
		if (!datasetId || !dateColumn || !valueColumn) return;
		setBusy("train");
		setError("");
		setTraining(null);
		setForecast(null);
		try {
			const response = await jsonRequest<TrainingResult>(
				"/analytics/forecast/train",
				"POST",
				{ datasetId, dateColumn, valueColumn },
			);
			setTraining(response.data);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Forecast model could not be trained.",
			);
		} finally {
			setBusy(null);
		}
	};

	const predict = async () => {
		if (!datasetId || !dateColumn || !valueColumn) return;
		setBusy("predict");
		setError("");
		setForecast(null);
		try {
			const response = await jsonRequest<ForecastResult>(
				"/analytics/forecast",
				"POST",
				{ datasetId, dateColumn, valueColumn, periods },
			);
			setForecast(response.data);
			setTraining((current) =>
				current ?? {
					datasetId,
					modelVersion: response.data.modelVersion,
					frequency: "",
					trainedAt: response.data.trainedAt,
					metrics: response.data.metrics,
				},
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Forecast could not be generated.",
			);
		} finally {
			setBusy(null);
		}
	};

	const selectedDataset = datasets.find((dataset) => dataset.id === datasetId);

	return (
		<>
			<PageHeading
				eyebrow="TRAINED ON YOUR DATA"
				title="Sales forecasting"
				description="Train and evaluate a dataset-specific model, then predict future periods using the saved version."
			/>
			{error && <ErrorNotice message={error} />}
			{loadingDatasets ? (
				<LoadingBlock label="Loading datasets" />
			) : datasets.length === 0 ? (
				<section className="panel panel-empty">
					<EmptyState
						title="Upload a dataset to begin"
						description="Forecasting needs a dataset with a date column and a numeric measure."
					/>
				</section>
			) : (
				<>
					<section className="panel forecast-panel">
						<div className="forecast-panel-heading">
							<span className="forecast-icon"><Database size={16} /></span>
							<div>
								<strong>Training data</strong>
								<p>Training is explicit; prediction only loads the saved model.</p>
							</div>
						</div>
						<div className="forecast-controls">
							<label className="forecast-field">
								<span>Dataset</span>
								<select
									value={datasetId}
									onChange={(event) => setDatasetId(event.target.value)}
								>
									{datasets.map((dataset) => (
										<option value={dataset.id} key={dataset.id}>
											{dataset.name} · {dataset.rowCount ?? 0} rows
										</option>
									))}
								</select>
							</label>
							<label className="forecast-field">
								<span>Date column</span>
								<select
									value={dateColumn}
									onChange={(event) => {
										setDateColumn(event.target.value);
										setTraining(null);
										setForecast(null);
									}}
									disabled={loadingSchema || dateColumns.length === 0}
								>
									<option value="">Select a date column</option>
									{dateColumns.map((column) => (
										<option value={column.name} key={column.name}>
											{column.name}
										</option>
									))}
								</select>
							</label>
							<label className="forecast-field">
								<span>Measure to forecast</span>
								<select
									value={valueColumn}
									onChange={(event) => {
										setValueColumn(event.target.value);
										setTraining(null);
										setForecast(null);
									}}
									disabled={loadingSchema || valueColumns.length === 0}
								>
									<option value="">Select a numeric column</option>
									{valueColumns.map((column) => (
										<option value={column.name} key={column.name}>
											{column.name}
										</option>
									))}
								</select>
							</label>
						</div>
						{loadingSchema && <LoadingBlock label="Reading dataset columns" />}
						{schema && (!dateColumns.length || !valueColumns.length) && (
							<div className="forecast-note" role="status">
								This dataset needs at least one date and one numeric column.
							</div>
						)}
						<div className="forecast-actions">
							<button
								type="button"
								className="button button-secondary"
								onClick={() => void trainModel()}
								disabled={
									busy !== null ||
									loadingSchema ||
									!dateColumn ||
									!valueColumn
								}
							>
								<Activity size={15} />
								{busy === "train" ? "Training…" : training ? "Re-train model" : "Train model"}
							</button>
							<label className="forecast-period">
								<span>Forecast periods</span>
								<input
									type="number"
									min={1}
									max={90}
									value={periods}
									onChange={(event) =>
										setPeriods(Math.min(90, Math.max(1, Number(event.target.value) || 1)))
									}
								/>
							</label>
							<button
								type="button"
								className="button button-primary"
								onClick={() => void predict()}
								disabled={
									busy !== null ||
									loadingSchema ||
									!dateColumn ||
									!valueColumn
								}
							>
								<Sparkles size={15} />
								{busy === "predict" ? "Predicting…" : "Predict"}
							</button>
						</div>
						{selectedDataset && schema && (
							<p className="forecast-data-note">
								{selectedDataset.name} · data revision{" "}
								{new Date(schema.updatedAt).toLocaleString()}
							</p>
						)}
					</section>

					{training && (
						<section className="panel forecast-result-panel">
							<div className="forecast-result-heading">
								<div>
									<span className="eyebrow">MODEL EVALUATION</span>
									<h2>Training completed</h2>
								</div>
								<span className="forecast-model-version">
									{training.modelVersion.slice(0, 10)}
								</span>
							</div>
							<div className="forecast-metrics">
								<div><span>MAE</span><strong>{training.metrics.mae.toFixed(2)}</strong></div>
								<div><span>RMSE</span><strong>{training.metrics.rmse.toFixed(2)}</strong></div>
								<div><span>Train periods</span><strong>{training.metrics.training_periods}</strong></div>
								<div><span>Validation periods</span><strong>{training.metrics.validation_periods}</strong></div>
							</div>
						</section>
					)}

					{forecast && (
						<section className="panel forecast-result-panel">
							<div className="forecast-result-heading">
								<div>
									<span className="eyebrow">PREDICTION</span>
									<h2>Forecast output</h2>
								</div>
								<span>{forecast.method}</span>
							</div>
							<div className="forecast-table-scroll">
								<table className="forecast-table">
									<thead><tr><th>Period</th><th>Predicted value</th></tr></thead>
									<tbody>
										{forecast.forecast.map((point) => (
											<tr key={point.date}>
												<td>{new Date(point.date).toLocaleDateString()}</td>
												<td>{point.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					)}
				</>
			)}
		</>
	);
}
