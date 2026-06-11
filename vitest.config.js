import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
			e2b: path.resolve(__dirname, "./__mocks__/e2b.ts"),
		},
	},

	test: {
		environment: "node",
		setupFiles: ["./env.setup.ts"],
		include: ["tests/units/**/*.test.ts"],
		coverage: {
			all: true,
			include: ["actions/crm/**/*.ts"],
			exclude: [
				"actions/crm/contract-line-items/**/*.ts",
				"actions/crm/opportunity-line-items/**/*.ts",
				"actions/crm/opportunity/dashboard/**/*.ts",
			],
			provider: "v8",
			reporter: ["text", "lcov", "json-summary", "json"],
			reportOnFailure: true,
			thresholds: {
				branches: 70,
				functions: 70,
				lines: 80,
				statements: 80,
			},
		},
	},
});
