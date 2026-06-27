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
		setupFiles: ["./env.integration.setup.ts"],
		include: ["tests/integration/**/*.test.ts"],
		exclude: [
			"tests/units/**",
			"tests/integration/helpers/**",
			"tests/integration/fixtures/**",
			"tests/integration/__utils__/**",
			"node_modules/**",
			"dist/**",
			".next/**",
		],
		globalSetup: ["./tests/integration/__utils__/global-setup.ts"],
		testTimeout: 30_000,
		hookTimeout: 60_000,
		pool: "forks",
		forks: {
			singleFork: true,
		},
		fileParallelism: false,
		sequence: {
			shuffle: false,
		},
		coverage: {
			enabled: false,
		},
	},
});
