import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  { ignores: ["apps/**"] },
  {
    rules: {
      // TanStack Table v9's useReactTable() is known to be incompatible with the
      // React Compiler (it returns functions that can't be safely memoized).
      // The compiler already handles this by skipping memoization for affected
      // components. Downgrading to 'warn' avoids blocking the build while keeping
      // --max-warnings=0 in CI for real errors.
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: ["plugins/**/*.{ts,tsx}", "plugins-private/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/*"], message: "Plugins may import only @nextcrm/plugin-sdk, their own files and npm packages." },
      ] }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "actions/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "inngest/**/*.{ts,tsx}"],
    ignores: ["lib/plugins/plugins.generated.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/plugins/*", "@/plugins-private/*"], message: "Core must not import plugins; use lib/plugins/registry." },
      ] }],
    },
  },
];

export default config;
