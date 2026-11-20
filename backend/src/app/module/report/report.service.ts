import PDFDocument from "pdfkit";
import { QueryStatus, ReportStatus } from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/appError.js";
import type { AuditRequestContext } from "../audit/audit.service.js";
import { auditService } from "../audit/audit.service.js";

type ReportQuery = {
	question: string;
	resultSummary: string | null;
	createdAt: Date;
};

type GeneratedReport = {
	summary: string;
	findings: string[];
	recommendations: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const createPdf = (title: string, summary: string) =>
	new Promise<Buffer>((resolve, reject) => {
		const document = new PDFDocument({
			size: "A4",
			margin: 56,
			bufferPages: true,
		});
		const chunks: Buffer[] = [];
		document.on("data", (chunk: Buffer) => chunks.push(chunk));
		document.on("end", () => resolve(Buffer.concat(chunks)));
		document.on("error", reject);

		document.fontSize(22).fillColor("#172554").text(title, { align: "left" });
		document.moveDown(0.5);
		document
			.fontSize(10)
			.fillColor("#64748b")
			.text(`Generated ${new Date().toLocaleString()}`);
		document.moveDown(1.5);
		document.fontSize(11).fillColor("#172033").text(summary, {
			align: "left",
			lineGap: 5,
		});
		document.end();
	});

const isGeneratedReport = (value: unknown): value is GeneratedReport =>
	isRecord(value) &&
	typeof value.summary === "string" &&
	value.summary.trim().length > 0 &&
	Array.isArray(value.findings) &&
	value.findings.every((item) => typeof item === "string") &&
	Array.isArray(value.recommendations) &&
	value.recommendations.every((item) => typeof item === "string");

const generateReportContent = async (
	title: string,
	queries: ReportQuery[],
): Promise<GeneratedReport> => {
	if (!config.ai_service_api_key) {
		throw new AppError("AI service is not configured.", 503);
	}

	let response: Response;
	try {
		response = await fetch(
			`${config.ai_service_url.replace(/\/$/, "")}/api/v1/reports/generate`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": config.ai_service_api_key,
				},
				signal: AbortSignal.timeout(60_000),
				body: JSON.stringify({
					title,
					queries: queries.map((query) => ({
						question: query.question.slice(0, 1_000),
						summary: (query.resultSummary ?? "No summary was saved.").slice(
							0,
							1_000,
						),
						created_at: query.createdAt.toISOString(),
					})),
				}),
			},
		);
	} catch {
		throw new AppError("AI report service is unavailable.", 502);
	}

	if (!response.ok) {
		throw new AppError(
			"AI report generation could not be completed.",
			response.status === 503 ? 503 : 502,
		);
	}
	let result: unknown;
	try {
		result = await response.json();
	} catch {
		throw new AppError("AI report service returned an invalid response.", 502);
	}
	if (!isGeneratedReport(result)) {
		throw new AppError("AI report service returned an invalid response.", 502);
	}
	return result;
};

const buildSummary = (report: GeneratedReport, queries: ReportQuery[]) =>
	[
		"Executive summary",
		report.summary,
		"Key findings",
		...(report.findings.length
			? report.findings.map((finding) => `- ${finding}`)
			: ["No additional findings were reported."]),
		"Recommendations",
		...(report.recommendations.length
			? report.recommendations.map((recommendation) => `- ${recommendation}`)
			: ["No recommendations were supported by the available evidence."]),
		"Source queries",
		...queries.map(
			(query, index) =>
				`${index + 1}. ${query.question}\n${query.resultSummary ?? "No summary was saved."}`,
		),
	].join("\n\n");

const createReport = async (
	userId: string,
	title: string,
	queryIds?: string[],
	context: AuditRequestContext = {},
) => {
	const queries = await prisma.queryHistory.findMany({
		where: {
			userId,
			status: QueryStatus.SUCCESS,
			...(queryIds ? { id: { in: queryIds } } : {}),
		},
		select: { id: true, question: true, resultSummary: true, createdAt: true },
		orderBy: { createdAt: "desc" },
		take: queryIds ? 50 : 10,
	});
	if (!queries.length) {
		throw new AppError(
			"No successful queries are available for a report.",
			422,
		);
	}
	if (queryIds && queries.length !== new Set(queryIds).size) {
		throw new AppError(
			"One or more selected queries were not found or are not available.",
			404,
		);
	}

	const report = await prisma.report.create({
		data: { userId, title, status: ReportStatus.GENERATING },
	});
	let completedReport: Awaited<ReturnType<typeof prisma.report.update>>;
	let pdf: Buffer;
	try {
		const generated = await generateReportContent(title, queries);
		const summary = buildSummary(generated, queries);
		pdf = await createPdf(title, summary);
		completedReport = await prisma.report.update({
			where: { id: report.id },
			data: { summary, status: ReportStatus.COMPLETED },
		});
	} catch (error) {
		await prisma.report.update({
			where: { id: report.id },
			data: { status: ReportStatus.FAILED },
		});
		throw error;
	}
	await auditService.log({
		userId,
		action: "REPORT_GENERATED",
		category: "REPORT",
		resourceType: "Report",
		resourceId: report.id,
		description: "AI report generated.",
		metadata: { queryCount: queries.length },
		...context,
	});
	await auditService.log({
		userId,
		action: "REPORT_EXPORTED",
		category: "REPORT",
		resourceType: "Report",
		resourceId: report.id,
		description: "Generated report exported as PDF.",
		...context,
	});
	return { report: completedReport, pdf };
};

const downloadReport = async (
	userId: string,
	id: string,
	context: AuditRequestContext = {},
) => {
	const report = await prisma.report.findFirst({ where: { id, userId } });
	if (!report || report.status !== ReportStatus.COMPLETED || !report.summary) {
		throw new Error("Report not found.");
	}
	const pdf = await createPdf(report.title, report.summary);
	await auditService.log({
		userId,
		action: "REPORT_EXPORTED",
		category: "REPORT",
		resourceType: "Report",
		resourceId: report.id,
		description: "Saved report exported as PDF.",
		...context,
	});
	return { report, pdf };
};

export const reportService = { createReport, downloadReport };
