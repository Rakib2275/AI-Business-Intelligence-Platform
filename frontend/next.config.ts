import type { NextConfig } from "next";
import path from "node:path";

const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
	outputFileTracingRoot: path.resolve(process.cwd(), ".."),
	async rewrites() {
		return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
	},
};

export default nextConfig;
