import {
	ConversationStatus,
	MessageRole,
	MessageType,
	QueryStatus,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/appError.js";
import type { AuditRequestContext } from "../audit/audit.service.js";
import { auditService } from "../audit/audit.service.js";
import { buildConversationContext } from "../conversation/conversation.context.js";
import {
	parseChartConfiguration,
	suggestChartConfiguration,
} from "./query.chart.js";
import { assertSafeSql } from "./query.sql.js";

const maxResultRows = 500;

type DatasetColumn = { name: string; type: string };

const callAiService = async <T>(
	path: string,
	payload: Record<string, unknown>,
): Promise<T> => {
	if (!config.ai_service_api_key) {
		throw new Error("AI service is not configured. Set AI_SERVICE_API_KEY.");
	}

	const response = await fetch(
		`${config.ai_service_url.replace(/\/$/, "")}/api/v1/${path}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": config.ai_service_api_key,
			},
			signal: AbortSignal.timeout(30_000),
			body: JSON.stringify(payload),
		},
	);
	if (!response.ok) {
		throw new Error(`AI service returned status ${response.status}.`);
	}
	return (await response.json()) as T;
};

const getColumnSqlType = (type: string) => {
	switch (type.toUpperCase()) {
		case "NUMBER":
			return "NUMERIC";
		case "BOOLEAN":
			return "BOOLEAN";
		case "DATE":
			return "DATE";
		default:
			return "TEXT";
	}
};

const getDatasetColumns = (metadata: unknown, rows: unknown[]): DatasetColumn[] => {
	const savedColumns = Array.isArray(metadata)
		? (metadata[0] as { columns?: unknown } | undefined)?.columns
		: undefined;
	if (Array.isArray(savedColumns)) {
		return savedColumns.flatMap((column) => {
			if (!column || typeof column !== "object") return [];
			const value = column as { name?: unknown; type?: unknown };
			return typeof value.name === "string"
				? [{ name: value.name, type: typeof value.type === "string" ? value.type : "TEXT" }]
				: [];
		});
	}

	const firstRow = rows.find((row) => row && typeof row === "object");
	return firstRow && !Array.isArray(firstRow)
		? Object.keys(firstRow).map((name) => ({ name, type: "TEXT" }))
		: [];
};

const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;

const generateSql = async (
	question: string,
	tableName: string,
	description: string | null,
	columns: DatasetColumn[],
	conversation: Array<{ role: string; content: string }>,
) => {
	const result = await callAiService<{ sql?: unknown }>(
		"text-to-sql/generate",
		{
			question,
			table_name: tableName,
			description,
			columns,
			conversation,
		},
	);
	if (typeof result.sql !== "string" || !result.sql.trim()) {
		throw new Error("AI service returned an invalid SQL response.");
	}
	return result.sql.trim();
};

const summarizeResults = async (question: string, rows: Record<string, unknown>[]) => {
	if (!rows.length) {
		return {
			summary: "The query returned no matching rows.",
			findings: [],
			recommendations: [],
			chartConfiguration: suggestChartConfiguration(rows),
			analysisWarning: undefined,
		};
	}
	try {
		const result = await callAiService<{
			summary?: unknown;
			findings?: unknown;
			recommendations?: unknown;
			chartConfiguration?: unknown;
		}>(
			"text-to-sql/insights",
			{
				question,
				rows: rows.slice(0, 50),
				result_count: rows.length,
				result_truncated: rows.length === maxResultRows,
			},
		);
		if (
			typeof result.summary !== "string" ||
			!result.summary.trim() ||
			!Array.isArray(result.findings) ||
			!result.findings.every((item) => typeof item === "string") ||
			!Array.isArray(result.recommendations) ||
			!result.recommendations.every((item) => typeof item === "string")
		) {
			throw new Error("AI service returned an invalid business insights response.");
		}
		return {
			summary: result.summary.trim(),
			findings: result.findings,
			recommendations: result.recommendations,
			chartConfiguration:
				parseChartConfiguration(result.chartConfiguration, rows) ??
				suggestChartConfiguration(rows),
			analysisWarning: undefined,
		};
	} catch {
		return {
			summary: "The query completed, but its AI-generated analysis is unavailable.",
			findings: [],
			recommendations: [],
			chartConfiguration: suggestChartConfiguration(rows),
			analysisWarning: "AI analysis could not be generated. Query results are available.",
		};
	}
};

const runQuery = async (
	userId: string,
	datasetId: string,
	question: string,
	conversationId?: string,
	context: AuditRequestContext = {},
) => {
	const dataset = await prisma.businessData.findFirst({
		where: { id: datasetId, userId },
		include: { metadata: true },
	});
	if (!dataset) throw new AppError("Dataset not found.", 404);
	if (!Array.isArray(dataset.data) || dataset.data.length === 0) {
		throw new AppError("The selected dataset has no rows to query.", 409);
	}
	const conversationRecord = conversationId
		? await prisma.conversation.findFirst({
				where: { id: conversationId, userId },
				include: {
					messages: {
						orderBy: { createdAt: "desc" },
						take: 12,
						select: { role: true, content: true },
					},
				},
			})
		: await prisma.conversation.create({
				data: { userId, title: question.slice(0, 100) },
				include: { messages: { select: { role: true, content: true } } },
			});
	if (!conversationRecord) throw new AppError("Conversation not found.", 404);
	if (conversationRecord.status !== ConversationStatus.ACTIVE) {
		throw new AppError("Archived conversations cannot receive new questions.", 409);
	}
	if (!conversationId) {
		await auditService.log({
			userId,
			action: "CONVERSATION_CREATED",
			category: "CONVERSATION",
			resourceType: "Conversation",
			resourceId: conversationRecord.id,
			description: "Conversation created by a direct query request.",
			...context,
		});
	}
	const conversation = buildConversationContext(conversationRecord.messages);

	const history = await prisma.queryHistory.create({
		data: { userId, businessDataId: dataset.id, question },
	});
	const startedAt = Date.now();
	let generatedSql: string | undefined;
	let stage: "GENERATION" | "VALIDATION" | "EXECUTION" | "ANALYSIS" = "GENERATION";
	let rows: Record<string, unknown>[];
	let summary: string;
	let findings: string[];
	let recommendations: string[];
	let analysisChartConfiguration: ReturnType<typeof suggestChartConfiguration>;
	let analysisWarning: string | undefined;
	try {
		const tableName = dataset.tableName.toLowerCase();
		const columns = getDatasetColumns(dataset.metadata, dataset.data);
		if (!columns.length) throw new Error("No columns were found in the dataset.");

		generatedSql = await generateSql(
			question,
			tableName,
			dataset.description,
			columns,
			conversation,
		);
		stage = "VALIDATION";
		assertSafeSql(generatedSql, tableName);

		const recordDefinition = columns
			.map((column) => `${quoteIdentifier(column.name)} ${getColumnSqlType(column.type)}`)
			.join(", ");
		const executableSql = `WITH ${quoteIdentifier(tableName)} AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS source_rows(${recordDefinition})) SELECT * FROM (${generatedSql}) AS query_result LIMIT ${maxResultRows}`;
		stage = "EXECUTION";
		rows = await prisma.$transaction(async (transaction) => {
			await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
			await transaction.$executeRawUnsafe("SET LOCAL statement_timeout = '5000ms'");
			return transaction.$queryRawUnsafe<Record<string, unknown>[]>(
				executableSql,
				JSON.stringify(dataset.data),
			);
		});

		stage = "ANALYSIS";
		const analysis = await summarizeResults(question, rows);
		summary = analysis.summary;
		findings = analysis.findings;
		recommendations = analysis.recommendations;
		analysisChartConfiguration = analysis.chartConfiguration;
		analysisWarning = analysis.analysisWarning;
	} catch {
		const validationRejected = stage === "VALIDATION";
		const safeMessage = validationRejected
			? "Generated SQL was rejected by the read-only query validator."
			: "The query could not be completed. Please review the question and selected dataset.";
		await prisma.queryHistory.update({
			where: { id: history.id },
			data: {
				...(generatedSql && { generatedSql }),
				executionTime: Date.now() - startedAt,
				status: validationRejected ? QueryStatus.BLOCKED : QueryStatus.FAILED,
				errorMessage: safeMessage,
			},
		});
		await prisma.message.createMany({
			data: [
				{
					conversationId: conversationRecord.id,
					role: MessageRole.USER,
					messageType: MessageType.TEXT,
					content: question,
				},
				{
					conversationId: conversationRecord.id,
					role: MessageRole.ASSISTANT,
					messageType: MessageType.ERROR,
					content: safeMessage,
					queryId: history.id,
				},
			],
		});
		await auditService.log({
			userId,
			action: validationRejected ? "SQL_VALIDATION_REJECTED" : "QUERY_FAILED",
			category: "QUERY",
			status: validationRejected ? "REJECTED" : "FAILURE",
			resourceType: "QueryHistory",
			resourceId: history.id,
			description: safeMessage,
			metadata: { datasetId: dataset.id, conversationId: conversationRecord.id, stage },
			...context,
		});
		await auditService.log({
			userId,
			action: "MESSAGE_CREATED",
			category: "CONVERSATION",
			resourceType: "Conversation",
			resourceId: conversationRecord.id,
			description: "User question and assistant error message saved.",
			metadata: { queryId: history.id, messageCount: 2 },
			...context,
		});
		await prisma.conversation.update({
			where: { id: conversationRecord.id },
			data: { updatedAt: new Date() },
		});
		throw new AppError(
			safeMessage,
			validationRejected ? 422 : stage === "GENERATION" || stage === "ANALYSIS" ? 502 : 422,
		);
	}

	const executionTime = Date.now() - startedAt;
	const columns = rows.length ? Object.keys(rows[0]) : [];
	const chartConfiguration = analysisChartConfiguration;
	const updatedHistory = await prisma.$transaction(async (transaction) => {
		const updated = await transaction.queryHistory.update({
			where: { id: history.id },
			data: {
				generatedSql,
				resultSummary: summary,
				executionTime,
				status: QueryStatus.SUCCESS,
			},
		});
		await transaction.message.createMany({
			data: [
				{
					conversationId: conversationRecord.id,
					role: MessageRole.USER,
					messageType: MessageType.TEXT,
					content: question,
				},
				{
					conversationId: conversationRecord.id,
					role: MessageRole.ASSISTANT,
					messageType: MessageType.SQL,
					content: generatedSql ?? "",
					queryId: history.id,
				},
				{
					conversationId: conversationRecord.id,
					role: MessageRole.ASSISTANT,
					messageType: MessageType.INSIGHT,
					content: summary,
					queryId: history.id,
					metadata: {
						resultCount: rows.length,
						columns,
						chartConfiguration,
						analysisAvailable: !analysisWarning,
						findings,
						recommendations,
					},
				},
			],
		});
		await transaction.conversation.update({
			where: { id: conversationRecord.id },
			data: { updatedAt: new Date() },
		});
		return updated;
	});
	await auditService.log({
		userId,
		action: "QUERY_EXECUTED",
		category: "QUERY",
		resourceType: "QueryHistory",
		resourceId: history.id,
		description: "Read-only business data query executed.",
		metadata: {
			datasetId: dataset.id,
			conversationId: conversationRecord.id,
			executionTime,
			resultCount: rows.length,
			analysisAvailable: !analysisWarning,
		},
		...context,
	});
	await auditService.log({
		userId,
		action: "AI_INSIGHT_GENERATED",
		category: "AI",
		status: analysisWarning ? "FAILURE" : "SUCCESS",
		resourceType: "QueryHistory",
		resourceId: history.id,
		description: analysisWarning ?? "AI-generated analysis completed.",
		metadata: { datasetId: dataset.id, analysisAvailable: !analysisWarning },
		...context,
	});
	await auditService.log({
		userId,
		action: "AI_SQL_GENERATED",
		category: "AI",
		resourceType: "QueryHistory",
		resourceId: history.id,
		description: "SQL generated and passed read-only validation.",
		metadata: { datasetId: dataset.id },
		...context,
	});
	await auditService.log({
		userId,
		action: "MESSAGE_CREATED",
		category: "CONVERSATION",
		resourceType: "Conversation",
		resourceId: conversationRecord.id,
		description: "Question, SQL, and assistant insight messages saved.",
		metadata: { queryId: history.id, messageCount: 3 },
		...context,
	});

	return {
		history: updatedHistory,
		queryId: history.id,
		conversationId: conversationRecord.id,
		sql: generatedSql,
		rows,
		columns,
		chartConfiguration,
		summary,
		findings,
		recommendations,
		analysisWarning,
		truncated: rows.length === maxResultRows,
	};
};

const refreshSavedQuery = async (userId: string, queryId: string) => {
	const history = await prisma.queryHistory.findFirst({
		where: { id: queryId, userId, status: QueryStatus.SUCCESS },
		select: { id: true, businessDataId: true, generatedSql: true, resultSummary: true },
	});
	if (!history?.businessDataId || !history.generatedSql) {
		throw new AppError("Saved query is not available for this user.", 404);
	}
	const dataset = await prisma.businessData.findFirst({
		where: { id: history.businessDataId, userId },
		include: { metadata: true },
	});
	if (!dataset || !Array.isArray(dataset.data)) {
		throw new AppError("The saved query's source dataset is unavailable.", 409);
	}
	const columns = getDatasetColumns(dataset.metadata, dataset.data);
	if (!columns.length) throw new AppError("The saved query has no available columns.", 409);
	try {
		assertSafeSql(history.generatedSql, dataset.tableName.toLowerCase());
	} catch {
		throw new AppError("The saved query no longer passes read-only validation.", 409);
	}
	const recordDefinition = columns
		.map((column) => `${quoteIdentifier(column.name)} ${getColumnSqlType(column.type)}`)
		.join(", ");
	const executableSql = `WITH ${quoteIdentifier(dataset.tableName.toLowerCase())} AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS source_rows(${recordDefinition})) SELECT * FROM (${history.generatedSql}) AS query_result LIMIT ${maxResultRows}`;
	const rows = await prisma.$transaction(async (transaction) => {
		await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
		await transaction.$executeRawUnsafe("SET LOCAL statement_timeout = '5000ms'");
		return transaction.$queryRawUnsafe<Record<string, unknown>[]>(
			executableSql,
			JSON.stringify(dataset.data),
		);
	});
	return {
		queryId: history.id,
		rows,
		columns: rows.length ? Object.keys(rows[0]) : [],
		chartConfiguration: suggestChartConfiguration(rows),
		summary: history.resultSummary,
		truncated: rows.length === maxResultRows,
	};
};

const getQueryHistory = (userId: string) =>
	prisma.queryHistory.findMany({
		where: { userId },
		include: { businessData: { select: { id: true, name: true } } },
		orderBy: { createdAt: "desc" },
		take: 50,
	});

export const queryService = { runQuery, getQueryHistory, refreshSavedQuery };