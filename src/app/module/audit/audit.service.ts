import type { Request } from "express";
import type { Prisma } from "../../../generated/prisma/client";
import type {
	AuditCategory,
	AuditStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const sensitiveKey =
	/(password|token|secret|api.?key|authorization|cookie|otp)/i;

type SanitizedJson =
	| string
	| number
	| boolean
	| SanitizedJson[]
	| { [key: string]: SanitizedJson };

const sanitizeJson = (
	value: unknown,
	seen = new WeakSet<object>(),
	depth = 0,
): SanitizedJson | undefined => {
	if (typeof value === "string" || typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number")
		return Number.isFinite(value) ? value : undefined;
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (value === null) return undefined;
	if (depth >= 6) return "[Truncated]";

	if (Array.isArray(value)) {
		return value.slice(0, 100).flatMap((item) => {
			const sanitized = sanitizeJson(item, seen, depth + 1);
			return sanitized === undefined ? [] : [sanitized];
		});
	}

	if (typeof value !== "object") return undefined;
	if (seen.has(value)) return "[Circular]";

	seen.add(value);
	const result: { [key: string]: SanitizedJson } = {};
	for (const [key, item] of Object.entries(value).slice(0, 100)) {
		if (sensitiveKey.test(key)) continue;
		const sanitized = sanitizeJson(item, seen, depth + 1);
		if (sanitized !== undefined) result[key] = sanitized;
	}
	seen.delete(value);
	return result;
};

export type AuditRequestContext = {
	ipAddress?: string;
	userAgent?: string;
};

export const getAuditRequestContext = (req: Request): AuditRequestContext => ({
	ipAddress: req.ip || undefined,
	userAgent: req.get("user-agent")?.slice(0, 500),
});

type AuditEvent = AuditRequestContext & {
	userId?: string | null;
	action: string;
	category?: AuditCategory;
	resourceType?: string;
	resourceId?: string;
	description?: string;
	metadata?: Record<string, unknown>;
	status?: AuditStatus;
};

const log = async (event: AuditEvent) => {
	const metadata = sanitizeJson(event.metadata);
	return prisma.auditLog.create({
		data: {
			userId: event.userId ?? null,
			action: event.action,
			category: event.category,
			resource: event.resourceType,
			resourceType: event.resourceType,
			resourceId: event.resourceId,
			description: event.description,
			metadata: metadata as Prisma.InputJsonValue | undefined,
			ipAddress: event.ipAddress,
			userAgent: event.userAgent,
			status: event.status,
		},
	});
};

const list = async (
	where: Prisma.AuditLogWhereInput,
	page: number,
	limit: number,
) => {
	const [items, total] = await prisma.$transaction([
		prisma.auditLog.findMany({
			where,
			include: { user: { select: { id: true, name: true, email: true } } },
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.auditLog.count({ where }),
	]);
	return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getById = (id: string) =>
	prisma.auditLog.findUnique({
		where: { id },
		include: { user: { select: { id: true, name: true, email: true } } },
	});

export const auditService = { log, list, getById };
