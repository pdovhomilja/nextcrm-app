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
	},
});
