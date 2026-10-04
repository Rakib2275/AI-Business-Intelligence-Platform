import type { NextConfig } from "next";
import path from "node:path";

const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
	outputFileTracingRoot: path.resolve(process.cwd(), ".."),
	experimental: {
		cpus: 1,
	},
	webpack(config, { dev }) {
		if (dev) config.cache = false;
		return config;
	},
	async rewrites() {
		return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
	},
};

export default nextConfig;
