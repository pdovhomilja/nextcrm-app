import { readFileSync } from "fs";
import { join } from "path";
import { ALL_LAYER_PROMPTS } from "../homepage-prompt-layers";
import {
  HOMEPAGE_BASE_PROMPT_ID,
  HOMEPAGE_BASE_PROMPT_BODY,
} from "../homepage-base-prompt";

// The seed constants are the source of truth; the migration SQL is generated
// from them so hosted environments get the same rows on deploy. This guard fails
// when a seed row is edited without regenerating the migration (substring checks).
const sql = readFileSync(
  join(
    __dirname,
    "../../migrations/20261001130000_seed_homepage_prompt_layers/migration.sql",
  ),
  "utf8",
);

describe("seed constants vs 20261001130000_seed_homepage_prompt_layers migration", () => {
  it("covers the expected number of layer rows", () => {
    expect(ALL_LAYER_PROMPTS.length).toBe(26);
  });

  it.each(ALL_LAYER_PROMPTS.map((p) => [p.name, p] as const))(
    "migration contains id, name and body for %s",
    (_name, p) => {
      expect(sql).toContain(p.id);
      expect(sql).toContain(p.name);
      expect(sql).toContain(p.body);
    },
  );

  // The base row's name was inserted by the earlier 20260930130200 migration; this
  // one only rewrites its body (by id), so id + body are what must stay in sync.
  it("migration contains the base prompt id and body", () => {
    expect(sql).toContain(HOMEPAGE_BASE_PROMPT_ID);
    expect(sql).toContain(HOMEPAGE_BASE_PROMPT_BODY);
  });
});
