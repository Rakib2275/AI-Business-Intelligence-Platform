export type ApiEnvelope<T> = {
	success: boolean;
	statusCode: number;
	message: string;
	data: T;
	meta?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

type ApiOptions = Omit<RequestInit, "body"> & {
	body?: unknown;
};

export async function apiRequest<T>(
	path: string,
	options: ApiOptions = {},
): Promise<ApiEnvelope<T>> {
	const headers = new Headers(options.headers);
	const isFormData =
		typeof FormData !== "undefined" && options.body instanceof FormData;
	if (options.body !== undefined && !isFormData)
		headers.set("Content-Type", "application/json");
	const requestBody: BodyInit | null | undefined =
		options.body === undefined
			? undefined
			: typeof FormData !== "undefined" && options.body instanceof FormData
				? options.body
				: JSON.stringify(options.body);

	let response: Response;
	try {
		response = await fetch(`/api/v1${path}`, {
			...options,
			headers,
			body: requestBody,
			credentials: "same-origin",
			cache: "no-store",
		});
	} catch {
		throw new ApiError(
			"Could not reach the API. Check that the backend is running.",
			0,
		);
	}

	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const envelope = payload as { message?: unknown } | null;
		throw new ApiError(
			typeof envelope?.message === "string"
				? envelope.message
				: `The request failed (${response.status}).`,
			response.status,
		);
	}

	return payload as ApiEnvelope<T>;
}

export const jsonRequest = <T>(path: string, method: string, body?: unknown) =>
	apiRequest<T>(path, { method, ...(body === undefined ? {} : { body }) });

export const queryString = (
	values: Record<string, string | number | undefined>,
) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(values)) {
		if (value !== undefined && value !== "") params.set(key, String(value));
	}
	const result = params.toString();
	return result ? `?${result}` : "";
};
