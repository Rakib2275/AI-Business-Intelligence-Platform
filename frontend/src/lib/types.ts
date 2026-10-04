export type User = {
	id: string;
	name: string;
	email: string;
	role: string;
};

export type PageMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type Dataset = {
	id: string;
	name: string;
	description?: string | null;
	tableName: string;
	rowCount?: number | null;
	columnCount?: number | null;
	createdAt: string;
};

export type ConversationMessage = {
	id: string;
	role: "USER" | "ASSISTANT" | "SYSTEM";
	messageType: string;
	content: string;
	queryId?: string | null;
	metadata?: {
		columns?: string[];
		resultCount?: number;
		chartConfiguration?: {
			type: string;
			xAxis?: string;
			series?: string[];
		};
		analysisAvailable?: boolean;
	} | null;
	createdAt: string;
};

export type Conversation = {
	id: string;
	title?: string | null;
	status: "ACTIVE" | "ARCHIVED";
	updatedAt: string;
	_count?: { messages: number };
	messages?: ConversationMessage[];
};

export type QueryRecord = {
	id: string;
	question: string;
	generatedSql?: string | null;
	resultSummary?: string | null;
	status: "SUCCESS" | "FAILED" | "PENDING" | "BLOCKED";
	createdAt: string;
	businessData?: { id: string; name: string } | null;
};

export type ChartConfiguration = {
	type: "TABLE" | "BAR_CHART" | "LINE_CHART";
	xAxis?: string;
	series: string[];
};

export type QueryAnswer = {
	history: QueryRecord;
	queryId: string;
	conversationId: string;
	sql?: string;
	rows: Array<Record<string, unknown>>;
	columns: string[];
	chartConfiguration: ChartConfiguration;
	summary: string;
	analysisWarning?: string;
	truncated: boolean;
};

export type DashboardWidget = {
	id: string;
	title: string;
	type: string;
	position: number;
	queryId?: string | null;
	configuration?: Record<string, unknown> | null;
	query?: QueryRecord | null;
};

export type Dashboard = {
	id: string;
	name: string;
	description?: string | null;
	isDefault: boolean;
	widgets?: DashboardWidget[];
	_count?: { widgets: number };
	updatedAt: string;
};

export type AuditEvent = {
	id: string;
	userId?: string | null;
	action: string;
	category?: string | null;
	resourceType?: string | null;
	resourceId?: string | null;
	description?: string | null;
	metadata?: unknown;
	ipAddress?: string | null;
	userAgent?: string | null;
	status: "SUCCESS" | "FAILURE" | "REJECTED";
	createdAt: string;
	user?: { id: string; name: string; email: string } | null;
};

export type RefreshedWidgetData = {
	rows: Array<Record<string, unknown>>;
	columns: string[];
	chartConfiguration: ChartConfiguration;
	summary?: string | null;
};
