import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.env.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^e2b$": "<rootDir>/__mocks__/e2b.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react", target: "es2017" } }],
    // sanitize-html >= 2.17.6 pulls in ESM-only htmlparser2@12 and its dom/entities deps
    "^.+\\.m?js$": ["ts-jest", { tsconfig: { allowJs: true, target: "es2017" } }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?(htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)",
  ],
};

export default config;
