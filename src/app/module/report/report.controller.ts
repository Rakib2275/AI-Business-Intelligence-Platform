import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { reportService } from "./report.service";
import { getAuditRequestContext } from "../audit/audit.service";

const fileNameFor = (title: string) =>
	`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report"}.pdf`;

const createReport = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const { report, pdf } = await reportService.createReport(
		userId,
		req.body.title,
		req.body.queryIds,
		getAuditRequestContext(req),
	);
	res
		.status(httpStatus.CREATED)
		.type("application/pdf")
		.attachment(fileNameFor(report.title))
		.set("X-Report-Id", report.id)
		.send(pdf);
});

const downloadReport = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
	const { report, pdf } = await reportService.downloadReport(userId, id, getAuditRequestContext(req));
	res
		.status(httpStatus.OK)
		.type("application/pdf")
		.attachment(fileNameFor(report.title))
		.send(pdf);
});

export const reportController = { createReport, downloadReport };