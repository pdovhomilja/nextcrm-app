import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { ALL_LAYER_PROMPTS } from "../homepage-prompt-layers";
import {
  HOMEPAGE_BASE_PROMPT_ID,
  HOMEPAGE_BASE_PROMPT_BODY,
} from "../homepage-base-prompt";

// The seed constants are the source of truth; the migration SQL is generated from
// them so hosted environments get the same rows on deploy. The original library
// shipped in 20261001130000; additive cards added later ship as their own
// fixed-id seed migrations (an already-applied migration can never be edited).
// We concatenate every migration's SQL and assert each seed row appears somewhere,
// so a seed row edited without (re)generating its migration still fails this guard.
const migrationsDir = join(__dirname, "../../migrations");
const sql = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    try {
      return readFileSync(join(migrationsDir, d.name, "migration.sql"), "utf8");
    } catch {
      return "";
    }
  })
  .join("\n");

describe("seed constants vs seed migrations", () => {
  it("covers the expected number of layer rows", () => {
    expect(ALL_LAYER_PROMPTS.length).toBe(31);
  });

  it.each(ALL_LAYER_PROMPTS.map((p) => [p.name, p] as const))(
    "a migration contains id, name and body for %s",
    (_name, p) => {
      expect(sql).toContain(p.id);
      expect(sql).toContain(p.name);
      expect(sql).toContain(p.body);
    },
  );

  // The base row's name was inserted by the earlier 20260930130200 migration;
  // 20261001130000 only rewrites its body (by id), so id + body are what must
  // stay in sync.
  it("a migration contains the base prompt id and body", () => {
    expect(sql).toContain(HOMEPAGE_BASE_PROMPT_ID);
    expect(sql).toContain(HOMEPAGE_BASE_PROMPT_BODY);
  });
});
