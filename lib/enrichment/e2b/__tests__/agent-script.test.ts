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
    writeFileSync(fake, `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${path.join(dir, "args.txt")}"\nenv > "${path.join(dir, "args.txt.env")}"\n`);
    chmodSync(fake, 0o755);

    // Stands in for DNS: like the real lookup an IP literal resolves to itself,
    // hostnames resolve only to the addresses in FAKE_DNS.
    writeFileSync(
      path.join(dir, "fake-dns.mjs"),
      `import dns from 'dns';
import net from 'net';
const table = JSON.parse(process.env.FAKE_DNS || '{}');
dns.promises.lookup = async (host) => {
  if (net.isIP(host)) return [{ address: host, family: net.isIP(host) }];
  if (!table[host]) throw Object.assign(new Error('getaddrinfo ENOTFOUND ' + host), { code: 'ENOTFOUND' });
  return table[host].map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
};
`,
    );
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const publicDns = { "company.example": ["93.184.215.14", "2606:2800:21f:cb07:6820:80da:af6b:8b2c"] };

  const runAgent = (url: string, extraEnv: Record<string, string> = {}, dns: Record<string, string[]> = publicDns) => {
    const argsFile = path.join(dir, "args.txt");
    execFileSync(process.execPath, ["--import", path.join(dir, "fake-dns.mjs"), path.join(dir, "agent.mjs")], {
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${path.join(dir, "bin")}:${process.env.PATH}`,
        FAKE_URL: url,
        FAKE_DNS: JSON.stringify(dns),
        ...extraEnv,
      },
      encoding: "utf8",
    });
    return argsFile;
  };

  it.each([
    "file:///etc/passwd",
    "ftp://example.com/",
    "javascript:alert(1)",
    "http://localhost:49983/",
    "http://app.localhost/",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://0.0.0.0/",
    "http://10.1.2.3/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://224.0.0.1/",
    "http://255.255.255.255/",
    "http://198.18.0.1/",
    "http://198.19.255.255/",
    "not a url",
  ])("does not open %s", (url) => {
    const argsFile = runAgent(url);
    expect(existsSync(argsFile)).toBe(false);
  });

  it.each(["https://company.example/about", "http://company.example/", "https://172.32.0.1/"])("opens %s", (url) => {
    const argsFile = runAgent(url);
    expect(readFileSync(argsFile, "utf8").split("\n").slice(0, -1)).toEqual(["--ignore-https-errors", "open", url]);
  });

  it.each([
    ["a loopback address", ["127.0.0.1"]],
    ["a private address", ["10.0.0.5"]],
    ["a link-local address", ["169.254.169.254"]],
    ["a CGNAT address", ["100.100.1.1"]],
    ["a public and a private address", ["93.184.215.14", "192.168.0.10"]],
    ["IPv6 loopback", ["::1"]],
    ["an IPv6 unique-local address", ["fd12::1"]],
    ["an IPv6 link-local address", ["fe80::1"]],
    ["an IPv4-mapped private address", ["::ffff:10.0.0.1"]],
  ])("does not open a hostname that resolves to %s", (_label, addresses) => {
    const argsFile = runAgent("https://internal.example/", {}, { "internal.example": addresses });
    expect(existsSync(argsFile)).toBe(false);
  });

  it("does not open a hostname that does not resolve", () => {
    const argsFile = runAgent("https://nowhere.example/");
    expect(existsSync(argsFile)).toBe(false);
  });

  it("starts the browser without the model key in its environment", () => {
    const argsFile = runAgent("https://company.example/", { ANTHROPIC_API_KEY: "key-must-not-reach-browser" });
    expect(readFileSync(`${argsFile}.env`, "utf8")).not.toContain("key-must-not-reach-browser");
  });

  it("passes a tool-call URL to agent-browser as one literal argument, without shell expansion", () => {
    const marker = path.join(dir, "expanded");
    const url = `https://company.example/$(touch ${marker})\`touch ${marker}\`"; touch ${marker}; "`;
    const argsFile = runAgent(url);

    expect(existsSync(marker)).toBe(false);
    expect(readFileSync(argsFile, "utf8").split("\n").slice(0, -1)).toEqual(["--ignore-https-errors", "open", url]);
  });
});
