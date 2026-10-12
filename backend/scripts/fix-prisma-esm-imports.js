import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const generatedDirectory = path.resolve("src/generated/prisma");
const importPattern =
	/^(\s*(?:import|export)\s+(?:[^'"\r\n]*?\s+from\s+)?)(["'])(\.{1,2}\/[^'"]+)\2/gm;
const knownExtension = /\.(?:js|mjs|cjs|json|node|ts|tsx)$/;

function getSourceFiles(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return getSourceFiles(entryPath);
		}
		return /\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name) ? [entryPath] : [];
	});
}

let updatedImports = 0;

for (const filePath of getSourceFiles(generatedDirectory)) {
	const source = readFileSync(filePath, "utf8");
	const updatedSource = source.replace(importPattern, (match, prefix, quote, specifier) => {
		if (knownExtension.test(specifier)) {
			return match;
		}

		const basePath = path.resolve(path.dirname(filePath), specifier);
		const candidates = [
			`${basePath}.ts`,
			`${basePath}.tsx`,
			`${basePath}.js`,
			`${basePath}.mjs`,
			`${basePath}.cjs`,
			path.join(basePath, "index.ts"),
			path.join(basePath, "index.tsx"),
			path.join(basePath, "index.js"),
		];
		const resolvedPath = candidates.find(existsSync);

		if (!resolvedPath) {
			throw new Error(`Cannot resolve generated import "${specifier}" in ${filePath}`);
		}

		updatedImports++;
		const suffix = path.basename(resolvedPath).startsWith("index.")
			? "/index.js"
			: ".js";
		return `${prefix}${quote}${specifier}${suffix}${quote}`;
	});

	if (updatedSource !== source) {
		writeFileSync(filePath, updatedSource);
	}
}

console.log(`Updated ${updatedImports} generated Prisma ESM imports.`);
