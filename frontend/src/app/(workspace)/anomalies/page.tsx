"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Database, Sparkles } from "lucide-react";
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
	featureColumns: string[];
	trainedAt: string;
	metrics: {
		training_rows: number;
		flagged_training_rows: number;
		feature_count: number;
		contamination: number;
	};
};

type AnomalyCandidate = {
	rowIndex: number;
	score: number;
	values: Record<string, number | null>;
};

type DetectionResult = {
	totalRows: number;
	scoredRows: number;
	anomalyCount: number;
	truncated: boolean;
	anomalies: AnomalyCandidate[];
	modelVersion: string;
	trainedAt: string;
};

const isNumericColumn = (column: DatasetColumn) =>
	/number|numeric|integer|decimal|float|double/i.test(column.type);

export default function AnomaliesPage() {
	const [datasets, setDatasets] = useState<Dataset[]>([]);
	const [datasetId, setDatasetId] = useState("");
	const [schema, setSchema] = useState<DatasetSchema | null>(null);
	const [featureColumns, setFeatureColumns] = useState<string[]>([]);
	const [training, setTraining] = useState<TrainingResult | null>(null);
	const [detection, setDetection] = useState<DetectionResult | null>(null);
	const [loadingDatasets, setLoadingDatasets] = useState(true);
	const [loadingSchema, setLoadingSchema] = useState(false);
	const [busy, setBusy] = useState<"train" | "detect" | null>(null);
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
			setFeatureColumns([]);
			setTraining(null);
			setDetection(null);
			return;
		}

		let active = true;
		setLoadingSchema(true);
		setError("");
		setSchema(null);
		setTraining(null);
		setDetection(null);
		apiRequest<DatasetSchema>(`/business-data/${datasetId}/schema`)
			.then((response) => {
				if (!active) return;
				setSchema(response.data);
				setFeatureColumns(
					response.data.columns.filter(isNumericColumn).slice(0, 1).map((column) => column.name),
				);
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

	const numericColumns = useMemo(
		() => schema?.columns.filter(isNumericColumn) ?? [],
		[schema],
	);

	const toggleFeature = (column: string) => {
		setFeatureColumns((selected) => {
			const next = selected.includes(column)
				? selected.filter((item) => item !== column)
				: [...selected, column];
			return next;
		});
		setTraining(null);
		setDetection(null);
	};

	const trainModel = async () => {
		if (!datasetId || featureColumns.length === 0) return;
		setBusy("train");
		setError("");
		setTraining(null);
		setDetection(null);
		try {
			const response = await jsonRequest<TrainingResult>(
				"/analytics/anomalies/train",
				"POST",
				{ datasetId, featureColumns },
			);
			setTraining(response.data);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Anomaly model could not be trained.",
			);
		} finally {
			setBusy(null);
		}
	};

	const detect = async () => {
		if (!datasetId || featureColumns.length === 0) return;
		setBusy("detect");
		setError("");
		setDetection(null);
		try {
			const response = await jsonRequest<DetectionResult>(
				"/analytics/anomalies",
				"POST",
				{ datasetId, featureColumns },
			);
			setDetection(response.data);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Anomaly detection could not be completed.",
			);
		} finally {
			setBusy(null);
		}
	};

	return (
		<>
			<PageHeading
				eyebrow="TRAINED ON YOUR DATA"
				title="Anomaly detection"
				description="Train a dataset-specific Isolation Forest model, then score unusual rows with the saved model."
			/>
			{error && <ErrorNotice message={error} />}
			{loadingDatasets ? (
				<LoadingBlock label="Loading datasets" />
			) : datasets.length === 0 ? (
				<section className="panel panel-empty">
					<EmptyState
						title="Upload a dataset to begin"
						description="Anomaly detection needs a dataset with numeric columns."
					/>
				</section>
			) : (
				<>
					<section className="panel forecast-panel">
						<div className="forecast-panel-heading">
							<span className="forecast-icon"><Database size={16} /></span>
							<div>
								<strong>Training data</strong>
								<p>Choose numeric features. Retrain after the dataset changes.</p>
							</div>
						</div>
						<label className="forecast-field anomaly-dataset-field">
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
						{loadingSchema ? (
							<LoadingBlock label="Reading dataset columns" />
						) : numericColumns.length === 0 ? (
							<div className="forecast-note" role="status">
								This dataset has no columns identified as numeric.
							</div>
						) : (
							<fieldset className="anomaly-features">
								<legend>Numeric features (select 1–20)</legend>
								{numericColumns.map((column) => (
									<label key={column.name} className="anomaly-feature">
										<input
											type="checkbox"
											checked={featureColumns.includes(column.name)}
											onChange={() => toggleFeature(column.name)}
											disabled={
												!featureColumns.includes(column.name) &&
												featureColumns.length >= 20
											}
										/>
										<span>{column.name}</span>
									</label>
								))}
							</fieldset>
						)}
						<div className="forecast-actions">
							<button
								type="button"
								className="button button-secondary"
								onClick={() => void trainModel()}
								disabled={busy !== null || loadingSchema || featureColumns.length === 0}
							>
								<Activity size={15} />
								{busy === "train" ? "Training…" : training ? "Re-train model" : "Train model"}
							</button>
							<button
								type="button"
								className="button button-primary"
								onClick={() => void detect()}
								disabled={busy !== null || loadingSchema || featureColumns.length === 0}
							>
								<Sparkles size={15} />
								{busy === "detect" ? "Scoring…" : "Detect anomalies"}
							</button>
						</div>
						{schema && (
							<p className="forecast-data-note">
								{schema.name} · data revision {new Date(schema.updatedAt).toLocaleString()}
							</p>
						)}
					</section>

					{training && (
						<section className="panel forecast-result-panel">
							<div className="forecast-result-heading">
								<div>
									<span className="eyebrow">MODEL TRAINING</span>
									<h2>Training completed</h2>
								</div>
								<span className="forecast-model-version">
									{training.modelVersion.slice(0, 10)}
								</span>
							</div>
							<div className="forecast-metrics anomaly-metrics">
								<div><span>Training rows</span><strong>{training.metrics.training_rows || "—"}</strong></div>
								<div><span>Flagged during training</span><strong>{training.metrics.flagged_training_rows}</strong></div>
								<div><span>Features</span><strong>{training.featureColumns.length}</strong></div>
								<div><span>Contamination</span><strong>{training.metrics.contamination ? `${(training.metrics.contamination * 100).toFixed(0)}%` : "—"}</strong></div>
							</div>
							<p className="forecast-data-note">Flags are candidates for review, not confirmed incidents.</p>
						</section>
					)}

					{detection && (
						<section className="panel forecast-result-panel">
							<div className="forecast-result-heading">
								<div>
									<span className="eyebrow">PREDICTION</span>
									<h2>{detection.anomalyCount} unusual rows detected</h2>
								</div>
								<span>{detection.scoredRows} / {detection.totalRows} rows scored</span>
							</div>
							{detection.anomalies.length === 0 ? (
								<p className="anomaly-empty">No rows were flagged by this model.</p>
							) : (
								<div className="forecast-table-scroll">
									<table className="forecast-table">
										<thead>
											<tr>
												<th>Dataset row</th>
												<th>Anomaly score</th>
												{featureColumns.map((column) => <th key={column}>{column}</th>)}
											</tr>
										</thead>
										<tbody>
											{detection.anomalies.map((item) => (
												<tr key={`${item.rowIndex}-${item.score}`}>
													<td><AlertTriangle size={13} /> {item.rowIndex + 1}</td>
													<td>{item.score.toFixed(4)}</td>
													{featureColumns.map((column) => (
														<td key={column}>{item.values[column]?.toLocaleString(undefined, { maximumFractionDigits: 3 }) ?? "—"}</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							{detection.truncated && (
								<p className="forecast-note" role="status">
									Only the 1,000 highest-scoring flagged rows are shown.
								</p>
							)}
						</section>
					)}
				</>
			)}
		</>
	);
}
