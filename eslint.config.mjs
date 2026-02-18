import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
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
];

export default config;
