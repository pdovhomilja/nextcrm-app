const path = require("path");

// Workaround for Turbopack not setting `result.opts.from` when running
// PostCSS plugins: Tailwind derives its resolution base from that option, so
// with an empty value it walks up from the project's parent directory and
// cannot find the `tailwindcss` package or the `@config` file.
// `globalThis.__tw_resolve` lets us short-circuit Tailwind's own resolution.
globalThis.__tw_resolve = (request, base) => {
  if (request === "tailwindcss") {
    return require.resolve("tailwindcss/index.css", { paths: [__dirname] });
  }
  if (request.endsWith("tailwind.config.js")) {
    return path.join(__dirname, "tailwind.config.js");
  }
  return undefined;
};

module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
