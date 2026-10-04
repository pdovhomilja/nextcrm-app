import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const IMPORT = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|mjs|js)$/.test(name) ? [p] : [];
  });
}
function importsOf(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return Array.from(src.matchAll(IMPORT)).map((m) => m[1] ?? m[2] ?? m[3]);
}

describe("plugin boundaries", () => {
  it("core does not import plugins (except the generated registry)", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "actions", "lib", "components", "inngest"]) {
      for (const f of files(join(ROOT, dir))) {
        if (relative(ROOT, f) === "lib/plugins/plugins.generated.ts") continue;
        for (const spec of importsOf(f)) {
          if (/^@\/plugins(-private)?\//.test(spec)) offenders.push(`${relative(ROOT, f)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("plugins import only the SDK, their own files, react, zod and npm packages", () => {
    const offenders: string[] = [];
    for (const dir of ["plugins", "plugins-private"]) {
      for (const f of files(join(ROOT, dir))) {
        if (f.includes("__tests__")) continue;
        for (const spec of importsOf(f)) {
          const bad = spec.startsWith("@/") || spec.startsWith("../../") || spec.startsWith("@nextcrm/") && !spec.startsWith("@nextcrm/plugin-sdk");
          if (bad) offenders.push(`${relative(ROOT, f)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the SDK does not import core", () => {
    const offenders = files(join(ROOT, "packages/plugin-sdk/src")).flatMap((f) =>
      importsOf(f).filter((s) => s.startsWith("@/")).map((s) => `${relative(ROOT, f)} → ${s}`),
    );
    expect(offenders).toEqual([]);
  });
});
