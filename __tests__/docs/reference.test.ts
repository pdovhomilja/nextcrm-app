/**
 * The generated reference pages (pnpm docs:reference) must match the code they
 * describe. CI regenerates them and fails on any difference; these tests check
 * the committed pages against the sources directly.
 */
// better-auth is ESM-only; the tool list never needs a session.
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { readFileSync } from "fs";
import { allTools } from "@/lib/mcp/tools";
import { APP_ROLES } from "@/lib/authz/roles";

const page = (name: string) => readFileSync(`apps/docs/content/docs/reference/${name}.mdx`, "utf8");

function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf("\n## ", start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

it("the MCP page lists every registered tool exactly once", () => {
  const listed = Array.from(page("mcp-tools").matchAll(/^### `([a-z0-9_]+)`$/gm)).map((m) => m[1]);
  expect(listed).toHaveLength(allTools.length);
  expect([...listed].sort()).toEqual(allTools.map((t) => t.name).sort());
});

it("the environment page lists every variable in .env.example", () => {
  const keys = Array.from(readFileSync(".env.example", "utf8").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)).map((m) => m[1]);
  expect(keys.length).toBeGreaterThan(10);
  const text = page("environment");
  expect(keys.filter((k) => !text.includes(`| \`${k}\` |`))).toEqual([]);
});

it("the roles page lists exactly the roles in APP_ROLES", () => {
  const rows = Array.from(section(page("roles"), "Roles").matchAll(/^\| `([a-z]+)` \|/gm)).map((m) => m[1]);
  expect(rows).toEqual([...APP_ROLES]);
});
