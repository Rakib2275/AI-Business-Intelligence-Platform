import config from "../config/index.js";
import { AppError } from "../utils/appError.js";

type BkashTokenResponse = {
	id_token?: string;
	refresh_token?: string;
	expires_in?: number | string;
	refresh_token_expires_in?: number | string;
	statusCode?: string;
	statusMessage?: string;
};

type CachedTokens = {
	idToken: string;
	refreshToken?: string;
	idTokenExpiresAt: number;
	refreshTokenExpiresAt: number;
};

const tokenRefreshBufferMs = 10 * 60 * 1000;
let cachedTokens: CachedTokens | undefined;
let tokenRequest: Promise<string> | undefined;

const getExpiry = (seconds: number | string | undefined, fallback: number) => {
	const duration = Number(seconds);
	return Number.isFinite(duration) && duration > 0 ? duration * 1000 : fallback;
};

const parseTokenResponse = async (response: Response) => {
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok || !payload || typeof payload !== "object") {
		throw new AppError("bKash access token request failed.", 502);
	}
	return payload as BkashTokenResponse;
};

const saveTokens = (result: BkashTokenResponse) => {
	if (result.statusCode && result.statusCode !== "0000") {
		throw new AppError(
			result.statusMessage || "bKash access token request failed.",
			502,
		);
	}
	if (!result.id_token) {
		throw new AppError("bKash did not return an access token.", 502);
	}

	const now = Date.now();
	cachedTokens = {
		idToken: result.id_token,
		refreshToken: result.refresh_token,
		idTokenExpiresAt: now + getExpiry(result.expires_in, 60 * 60 * 1000),
		refreshTokenExpiresAt:
			now + getExpiry(result.refresh_token_expires_in, 28 * 24 * 60 * 60 * 1000),
	};
	return result.id_token;
};

const requestToken = async () => {
	const {
		bkash_base_url: baseUrl,
		bkash_username: username,
		bkash_password: password,
		bkash_app_key: appKey,
		bkash_app_secret: appSecret,
	} = config;

	if (!baseUrl || !username || !password || !appKey || !appSecret) {
		throw new AppError("bKash payment is not configured.", 503);
	}

	const request = async (url: string, body: Record<string, string>) => {
		try {
			return await fetch(url, {
				method: "POST",
				headers: authorizationHeaders,
				body: JSON.stringify(body),
			});
		} catch {
			throw new AppError("Could not connect to the bKash payment service.", 502);
		}
	};
	const authorizationHeaders = {
		"Content-Type": "application/json",
		Accept: "application/json",
		username,
		password,
	};

	if (
		cachedTokens?.refreshToken &&
		cachedTokens.refreshTokenExpiresAt > Date.now()
	) {
		const refreshResponse = await request(
			`${baseUrl}/tokenized/checkout/token/refresh`,
			{
				app_key: appKey,
				app_secret: appSecret,
				refresh_token: cachedTokens.refreshToken,
			},
		);
		if (refreshResponse.ok) {
			return saveTokens(await parseTokenResponse(refreshResponse));
		}
	}

	const grantResponse = await request(
		`${baseUrl}/tokenized/checkout/token/grant`,
		{ app_key: appKey, app_secret: appSecret },
	);
	return saveTokens(await parseTokenResponse(grantResponse));
};

export const getBkashIdToken = async () => {
	if (
		cachedTokens &&
		cachedTokens.idTokenExpiresAt > Date.now() + tokenRefreshBufferMs
	) {
		return cachedTokens.idToken;
	}

	if (!tokenRequest) {
		tokenRequest = requestToken();
	}
	try {
		return await tokenRequest;
	} finally {
		tokenRequest = undefined;
	}
};
