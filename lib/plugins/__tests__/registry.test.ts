import { execFileSync } from "node:child_process";
import { definePlugin } from "@nextcrm/plugin-sdk";
import { buildRegistry } from "@/lib/plugins/registry";

const make = (id: string) =>
  definePlugin({ id, name: id, version: "1.0.0", sdk: "^0.2.0", description: "", permissions: [], extensions: () => {} });

describe("plugin registry", () => {
  it("builds a registry and rejects duplicate ids", () => {
    const reg = buildRegistry([{ source: "public", definition: make("a-one"), messages: {} }]);
    expect(reg.map((p) => p.definition.id)).toEqual(["a-one"]);
    expect(() =>
      buildRegistry([
        { source: "public", definition: make("a-one"), messages: {} },
        { source: "private", definition: make("a-one"), messages: {} },
      ]),
    ).toThrow("Duplicate plugin id: a-one");
  });

  it("committed generated file is up to date", () => {
    // exits non-zero and prints a diff hint when stale
    execFileSync("node", ["scripts/plugins/generate-registry.mjs", "--check"], { stdio: "pipe" });
  });
});
