import PDFDocument from "pdfkit";
import { QueryStatus, ReportStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import type { AuditRequestContext } from "../audit/audit.service.js";
import { auditService } from "../audit/audit.service.js";

const createPdf = (title: string, summary: string) =>
	new Promise<Buffer>((resolve, reject) => {
		const document = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
		const chunks: Buffer[] = [];
		document.on("data", (chunk: Buffer) => chunks.push(chunk));
		document.on("end", () => resolve(Buffer.concat(chunks)));
		document.on("error", reject);

		document.fontSize(22).fillColor("#172554").text(title, { align: "left" });
		document.moveDown(0.5);
		document.fontSize(10).fillColor("#64748b").text(`Generated ${new Date().toLocaleString()}`);
		document.moveDown(1.5);
		document.fontSize(11).fillColor("#172033").text(summary, {
			align: "left",
			lineGap: 5,
		});
		document.end();
	});

const buildSummary = (
	queries: Array<{ question: string; resultSummary: string | null; createdAt: Date }>,
) =>
	queries.map((query, index) =>
		`${index + 1}. ${query.question}\n${query.resultSummary || "No summary was saved."}`,
	).join("\n\n");

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
	if (!queries.length) throw new Error("No successful queries are available for a report.");
	if (queryIds && queries.length !== new Set(queryIds).size) {
		throw new Error("One or more selected queries were not found or are not available.");
	}

	const report = await prisma.report.create({
		data: { userId, title, status: ReportStatus.GENERATING },
	});
	let completedReport: Awaited<ReturnType<typeof prisma.report.update>>;
	let pdf: Buffer;
	try {
		const summary = buildSummary(queries);
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