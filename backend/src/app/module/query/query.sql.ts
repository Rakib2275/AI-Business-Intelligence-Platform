import sqlParser, { type Select } from "node-sql-parser";

const parser = new sqlParser.Parser();
const databaseDialect = { database: "Postgresql" } as const;
const allowedFunctions = new Set([
	"ABS",
	"COALESCE",
	"DATE_PART",
	"DATE_TRUNC",
	"LENGTH",
	"LOWER",
	"NULLIF",
	"ROUND",
	"TRIM",
	"UPPER",
]);
const allowedAggregates = new Set(["AVG", "COUNT", "MAX", "MIN", "SUM"]);

type SqlAstNode = Record<string, unknown>;

export const assertSafeSql = (sql: string, tableName: string) => {
	const ast = parser.astify(sql, databaseDialect);
	if (Array.isArray(ast) || ast.type !== "select") {
		throw new Error("Only a single read-only SELECT query is allowed.");
	}
	const selectAst = ast as Select;
	const intoClause = (selectAst as Select & { into?: { position?: string | null } }).into;
	if (intoClause?.position) {
		throw new Error("SELECT INTO is not allowed.");
	}
	if (selectAst.with) {
		throw new Error("Common table expressions are not supported.");
	}

	const tables = parser.tableList(sql, databaseDialect);
	const allowedTable = `select::null::${tableName.toLowerCase()}`;
	if (!tables.length || tables.some((table) => table.toLowerCase() !== allowedTable)) {
		throw new Error("The query can only read from the selected dataset.");
	}

	const checkFunctions = (value: unknown): void => {
		if (Array.isArray(value)) {
			for (const item of value) checkFunctions(item);
			return;
		}
		if (!value || typeof value !== "object") return;

		const node = value as SqlAstNode;
		if (node.type === "function") {
			const functionName = node.name as { name?: Array<{ value?: string }>; schema?: unknown };
			const name = functionName.name?.at(-1)?.value?.toUpperCase();
			if (functionName.schema || !name || !allowedFunctions.has(name)) {
				throw new Error("The query contains a function that is not allowed.");
			}
		}
		if (node.type === "aggr_func" && !allowedAggregates.has(String(node.name).toUpperCase())) {
			throw new Error("The query contains an aggregate that is not allowed.");
		}

		for (const child of Object.values(node)) checkFunctions(child);
	};

	checkFunctions(ast);
};