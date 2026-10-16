/** Built-in venture apps shown under Ventures in the sidebar. */
export const BUILTIN_VENTURE_APPS = [
  {
    slug: "rofyt",
    name: "Rofyt",
    description: "Stats, graphs, and venture operations hub.",
    href: "/ventures/rofyt",
  },
] as const;

export const ROFYT_SLUG = "rofyt";

/** Canonical Git remote for ROFYT application code (override with ROFYT_GIT_REPOSITORY_URL). */
export const ROFYT_DEFAULT_GIT_REPOSITORY_URL =
  "https://github.com/jayandra06/rofyt-vensailabs";
