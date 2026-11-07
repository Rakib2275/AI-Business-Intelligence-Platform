import { queryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type {
	Conversation,
	Dashboard,
	Dataset,
	QueryRecord,
} from "@/lib/types";

export const workspaceQueryKeys = {
	datasets: ["workspace", "datasets"] as const,
	conversations: ["workspace", "conversations"] as const,
	conversationList: (page: number, limit: number) =>
		[...workspaceQueryKeys.conversations, "list", page, limit] as const,
	conversation: (id: string) =>
		[...workspaceQueryKeys.conversations, "detail", id] as const,
	dashboards: ["workspace", "dashboards"] as const,
	dashboardList: (page: number, limit: number) =>
		[...workspaceQueryKeys.dashboards, "list", page, limit] as const,
	dashboard: (id: string) =>
		[...workspaceQueryKeys.dashboards, "detail", id] as const,
	queryHistory: ["workspace", "query-history"] as const,
};

export const workspaceQueries = {
	datasets: () =>
		queryOptions({
			queryKey: workspaceQueryKeys.datasets,
			queryFn: async () => (await apiRequest<Dataset[]>("/business-data")).data,
		}),
	conversations: (page: number, limit: number) =>
		queryOptions({
			queryKey: workspaceQueryKeys.conversationList(page, limit),
			queryFn: async () =>
				(
					await apiRequest<Conversation[]>(
						`/conversations?page=${page}&limit=${limit}`,
					)
				).data,
		}),
	conversation: (id: string) =>
		queryOptions({
			queryKey: workspaceQueryKeys.conversation(id),
			queryFn: async () =>
				(await apiRequest<Conversation>(`/conversations/${id}`)).data,
		}),
	dashboards: (page: number, limit: number) =>
		queryOptions({
			queryKey: workspaceQueryKeys.dashboardList(page, limit),
			queryFn: async () =>
				(await apiRequest<Dashboard[]>(`/dashboards?page=${page}&limit=${limit}`))
					.data,
		}),
	dashboard: (id: string) =>
		queryOptions({
			queryKey: workspaceQueryKeys.dashboard(id),
			queryFn: async () =>
				(await apiRequest<Dashboard>(`/dashboards/${id}`)).data,
		}),
	queryHistory: () =>
		queryOptions({
			queryKey: workspaceQueryKeys.queryHistory,
			queryFn: async () => (await apiRequest<QueryRecord[]>("/query/history")).data,
		}),
};
