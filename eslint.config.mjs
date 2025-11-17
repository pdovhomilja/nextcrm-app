import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "**/lib/generated/**",
      "**/prisma/generated/**",
      "**/app/generated/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
  },
  {
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/incompatible-library": "off",
    },
  },
];

export default eslintConfig;
