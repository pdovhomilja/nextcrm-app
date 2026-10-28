import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getAgentScript } from "../agent-script";

// Runs the generated sandbox script for real, with a stubbed Anthropic SDK that
// asks for one browser_open, and a fake `agent-browser` that records its argv.
describe("enrichment agent script", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "agent-script-"));
    writeFileSync(path.join(dir, "agent.mjs"), getAgentScript());

    const sdk = path.join(dir, "node_modules", "@anthropic-ai", "sdk");
    mkdirSync(sdk, { recursive: true });
    writeFileSync(path.join(sdk, "package.json"), JSON.stringify({ name: "@anthropic-ai/sdk", type: "module", main: "index.js" }));
    writeFileSync(
      path.join(sdk, "index.js"),
      `let calls = 0;
export default class Anthropic {
  messages = {
    create: async () => calls++ === 0
      ? { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'browser_open', input: { url: process.env.FAKE_URL } }] }
      : { stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] },
  };
}
`,
    );

    const bin = path.join(dir, "bin");
    mkdirSync(bin);
    const fake = path.join(bin, "agent-browser");
    writeFileSync(fake, `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > "$ARGS_FILE"\n`);
    chmodSync(fake, 0o755);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("passes a tool-call URL to agent-browser as one literal argument, without shell expansion", () => {
    const marker = path.join(dir, "expanded");
    const url = `https://example.com/$(touch ${marker})\`touch ${marker}\`"; touch ${marker}; "`;
    const argsFile = path.join(dir, "args.txt");

    execFileSync(process.execPath, [path.join(dir, "agent.mjs")], {
      cwd: dir,
      env: { ...process.env, PATH: `${path.join(dir, "bin")}:${process.env.PATH}`, FAKE_URL: url, ARGS_FILE: argsFile },
      encoding: "utf8",
    });

    expect(existsSync(marker)).toBe(false);
    expect(readFileSync(argsFile, "utf8").split("\n").slice(0, -1)).toEqual(["--ignore-https-errors", "open", url]);
  });
});
