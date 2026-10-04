import { Prisma } from "../../../generated/prisma/client";
import {
	DashboardWidgetType,
	QueryStatus,
} from "../../../generated/prisma/enums";
import type { AuditRequestContext } from "../audit/audit.service";
import { auditService } from "../audit/audit.service";
import { AppError } from "../../utils/appError";
import { prisma } from "../../lib/prisma";
import { queryService } from "../query/query.service";

type DashboardPayload = {
	name?: string;
	description?: string | null;
	isDefault?: boolean;
	layout?: Record<string, unknown> | null;
};

type WidgetPayload = {
	title?: string;
	type?: DashboardWidgetType;
	queryId?: string | null;
	position?: number;
	configuration?: Record<string, unknown> | null;
};

const ensureOwnedDashboard = async (userId: string, id: string) => {
	const dashboard = await prisma.dashboard.findFirst({ where: { id, userId } });
	if (!dashboard) throw new AppError("Dashboard not found.", 404);
	return dashboard;
};

const ensureOwnedWidget = async (
	userId: string,
	dashboardId: string,
	widgetId: string,
) => {
	await ensureOwnedDashboard(userId, dashboardId);
	const widget = await prisma.dashboardWidget.findFirst({
		where: { id: widgetId, dashboardId },
	});
	if (!widget) throw new AppError("Dashboard widget not found.", 404);
	return widget;
};

const asJson = (value: Record<string, unknown> | null | undefined) =>
	value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue | undefined);

const create = async (
	userId: string,
	payload: DashboardPayload,
	context: AuditRequestContext,
) => {
	const dashboard = await prisma.$transaction(async (transaction) => {
		if (payload.isDefault) {
			await transaction.dashboard.updateMany({
				where: { userId },
				data: { isDefault: false },
			});
		}
		return transaction.dashboard.create({
			data: {
				userId,
				name: payload.name ?? "Untitled dashboard",
				description: payload.description,
				isDefault: payload.isDefault ?? false,
				layout: asJson(payload.layout),
			},
		});
	});
	await auditService.log({
		userId,
		action: "DASHBOARD_CREATED",
		category: "DASHBOARD",
		resourceType: "Dashboard",
		resourceId: dashboard.id,
		description: "Dashboard created.",
		...context,
	});
	return dashboard;
};

const list = async (userId: string, page: number, limit: number) => {
	const where = { userId };
	const [items, total] = await prisma.$transaction([
		prisma.dashboard.findMany({
			where,
			include: { _count: { select: { widgets: true } } },
			orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.dashboard.count({ where }),
	]);
	return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const get = async (userId: string, id: string) => {
	const dashboard = await prisma.dashboard.findFirst({
		where: { id, userId },
		include: {
			widgets: {
				orderBy: [{ position: "asc" }, { createdAt: "asc" }],
				include: {
					query: {
						select: {
							id: true,
							question: true,
							resultSummary: true,
							status: true,
							createdAt: true,
						},
					},
				},
			},
		},
	});
	if (!dashboard) throw new AppError("Dashboard not found.", 404);
	return dashboard;
};

const update = async (
	userId: string,
	id: string,
	payload: DashboardPayload,
	context: AuditRequestContext,
) => {
	await ensureOwnedDashboard(userId, id);
	const updated = await prisma.$transaction(async (transaction) => {
		if (payload.isDefault) {
			await transaction.dashboard.updateMany({
				where: { userId, id: { not: id } },
				data: { isDefault: false },
			});
		}
		return transaction.dashboard.update({
			where: { id },
			data: {
				...(payload.name !== undefined ? { name: payload.name } : {}),
				...(payload.description !== undefined
					? { description: payload.description }
					: {}),
				...(payload.isDefault !== undefined
					? { isDefault: payload.isDefault }
					: {}),
				...(payload.layout !== undefined
					? { layout: asJson(payload.layout) }
					: {}),
			},
		});
	});
	await auditService.log({
		userId,
		action: "DASHBOARD_UPDATED",
		category: "DASHBOARD",
		resourceType: "Dashboard",
		resourceId: id,
		description: "Dashboard updated.",
		metadata: { changedFields: Object.keys(payload) },
		...context,
	});
	return updated;
};

const remove = async (
	userId: string,
	id: string,
	context: AuditRequestContext,
) => {
	await ensureOwnedDashboard(userId, id);
	await prisma.dashboard.delete({ where: { id } });
	await auditService.log({
		userId,
		action: "DASHBOARD_DELETED",
		category: "DASHBOARD",
		resourceType: "Dashboard",
		resourceId: id,
		description: "Dashboard deleted.",
		...context,
	});
};

const listWidgets = async (userId: string, id: string) => {
	await ensureOwnedDashboard(userId, id);
	return prisma.dashboardWidget.findMany({
		where: { dashboardId: id },
		include: {
			query: {
				select: {
					id: true,
					question: true,
					resultSummary: true,
					status: true,
					createdAt: true,
				},
			},
		},
		orderBy: [{ position: "asc" }, { createdAt: "asc" }],
	});
};

const createWidget = async (
	userId: string,
	id: string,
	payload: WidgetPayload,
	context: AuditRequestContext,
) => {
	await ensureOwnedDashboard(userId, id);
	if (payload.queryId) {
		const query = await prisma.queryHistory.findFirst({
			where: { id: payload.queryId, userId, status: QueryStatus.SUCCESS },
			select: { id: true },
		});
		if (!query) throw new AppError("Query history not found.", 404);
	}
	const count = await prisma.dashboardWidget.count({
		where: { dashboardId: id },
	});
	if (count >= 100)
		throw new AppError("A dashboard may contain at most 100 widgets.", 409);
	const widget = await prisma.dashboardWidget.create({
		data: {
			dashboardId: id,
			title: payload.title ?? "Untitled widget",
			type: payload.type ?? DashboardWidgetType.TABLE,
			queryId: payload.queryId,
			position: payload.position ?? count,
			configuration: asJson(payload.configuration),
		},
	});
	await auditService.log({
		userId,
		action: "DASHBOARD_WIDGET_CREATED",
		category: "DASHBOARD",
		resourceType: "DashboardWidget",
		resourceId: widget.id,
		description: "Dashboard widget created.",
		metadata: {
			dashboardId: id,
			widgetType: widget.type,
			queryId: widget.queryId,
		},
		...context,
	});
	return widget;
};

const updateWidget = async (
	userId: string,
	id: string,
	widgetId: string,
	payload: WidgetPayload,
	context: AuditRequestContext,
) => {
	await ensureOwnedWidget(userId, id, widgetId);
	if (payload.queryId) {
		const query = await prisma.queryHistory.findFirst({
			where: { id: payload.queryId, userId, status: QueryStatus.SUCCESS },
			select: { id: true },
		});
		if (!query) throw new AppError("Query history not found.", 404);
	}
	const widget = await prisma.dashboardWidget.update({
		where: { id: widgetId },
		data: {
			...(payload.title !== undefined ? { title: payload.title } : {}),
			...(payload.type !== undefined ? { type: payload.type } : {}),
			...(payload.queryId !== undefined ? { queryId: payload.queryId } : {}),
			...(payload.position !== undefined ? { position: payload.position } : {}),
			...(payload.configuration !== undefined
				? { configuration: asJson(payload.configuration) }
				: {}),
		},
	});
	await auditService.log({
		userId,
		action: "DASHBOARD_WIDGET_UPDATED",
		category: "DASHBOARD",
		resourceType: "DashboardWidget",
		resourceId: widgetId,
		description: "Dashboard widget updated.",
		metadata: { dashboardId: id, changedFields: Object.keys(payload) },
		...context,
	});
	return widget;
};

const removeWidget = async (
	userId: string,
	id: string,
	widgetId: string,
	context: AuditRequestContext,
) => {
	await ensureOwnedWidget(userId, id, widgetId);
	await prisma.dashboardWidget.delete({ where: { id: widgetId } });
	await auditService.log({
		userId,
		action: "DASHBOARD_WIDGET_DELETED",
		category: "DASHBOARD",
		resourceType: "DashboardWidget",
		resourceId: widgetId,
		description: "Dashboard widget deleted.",
		metadata: { dashboardId: id },
		...context,
	});
};

const reorderWidgets = async (
	userId: string,
	id: string,
	widgets: Array<{ id: string; position: number }>,
	context: AuditRequestContext,
) => {
	await ensureOwnedDashboard(userId, id);
	const records = await prisma.dashboardWidget.findMany({
		where: {
			dashboardId: id,
			id: { in: widgets.map(({ id: widgetId }) => widgetId) },
		},
		select: { id: true },
	});
	if (records.length !== widgets.length) {
		throw new AppError(
			"One or more widgets do not belong to this dashboard.",
			404,
		);
	}
	await prisma.$transaction(
		widgets.map(({ id: widgetId, position }) =>
			prisma.dashboardWidget.updateMany({
				where: { id: widgetId, dashboardId: id },
				data: { position },
			}),
		),
	);
	await auditService.log({
		userId,
		action: "DASHBOARD_WIDGETS_REORDERED",
		category: "DASHBOARD",
		resourceType: "Dashboard",
		resourceId: id,
		description: "Dashboard widgets reordered.",
		metadata: { widgetCount: widgets.length },
		...context,
	});
	return listWidgets(userId, id);
};

const refreshWidget = async (
	userId: string,
	id: string,
	widgetId: string,
	context: AuditRequestContext = {},
) => {
	const widget = await ensureOwnedWidget(userId, id, widgetId);
	if (!widget.queryId) {
		throw new AppError("This widget is not connected to a saved query.", 409);
	}
	const result = await queryService.refreshSavedQuery(userId, widget.queryId);
	await auditService.log({
		userId,
		action: "DASHBOARD_WIDGET_REFRESHED",
		category: "DASHBOARD",
		resourceType: "DashboardWidget",
		resourceId: widgetId,
		description: "Dashboard widget data refreshed from its saved query.",
		metadata: {
			dashboardId: id,
			queryId: widget.queryId,
			resultCount: result.rows.length,
		},
		...context,
	});
	return { widget, ...result };
};

export const dashboardService = {
	create,
	list,
	get,
	update,
	remove,
	listWidgets,
	createWidget,
	updateWidget,
	removeWidget,
	reorderWidgets,
	refreshWidget,
};
