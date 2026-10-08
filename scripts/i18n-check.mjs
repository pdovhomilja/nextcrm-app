#!/usr/bin/env node
// Compares every locale file against its en.json: locales/*.json and plugins/*/messages/*.json.
// Exits 1 if a locale lacks a key that en.json has; extra keys are listed but do not fail.
// Usage: node scripts/i18n-check.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const dirs = ["locales"];
const pluginsDir = join(ROOT, "plugins");
if (existsSync(pluginsDir)) {
  for (const d of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(join(pluginsDir, d.name, "messages", "en.json"))) dirs.push(join("plugins", d.name, "messages"));
  }
}

const flatten = (obj, prefix = "", out = new Set()) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.add(key);
  }
  return out;
};
const load = (file) => flatten(JSON.parse(readFileSync(join(ROOT, file), "utf8")));

let failed = false;
for (const dir of dirs) {
  const en = load(join(dir, "en.json"));
  for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json") && f !== "en.json").sort()) {
    const keys = load(join(dir, file));
    const missing = [...en].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !en.has(k));
    if (missing.length) {
      failed = true;
      console.error(`${dir}/${file}: ${missing.length} missing key(s)`);
      for (const k of missing) console.error(`  - ${k}`);
    }
    if (extra.length) {
      console.warn(`${dir}/${file}: ${extra.length} extra key(s) not in en.json`);
      for (const k of extra) console.warn(`  + ${k}`);
    }
  }
}
if (failed) process.exit(1);
console.log(`i18n check passed (${dirs.length} message dir(s))`);
