import { sanitizeInboundEmailHtml } from "@/lib/email/sanitize-inbound-html";

describe("sanitizeInboundEmailHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitizeInboundEmailHtml("")).toBe("");
  });

  it("neutralizes position: fixed in inline style attributes", () => {
    const input = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;">Overlay</div>`;
    const output = sanitizeInboundEmailHtml(input);
    expect(output).not.toContain("position: fixed");
    expect(output).not.toContain("position:fixed");
    expect(output).toContain("position:relative");
  });

  it("strips backdrop-filter and blur filters from inline style attributes", () => {
    const input = `<div style="backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(8px); filter: blur(5px); background: rgba(0,0,0,0.5);">Overlay</div>`;
    const output = sanitizeInboundEmailHtml(input);
    expect(output).not.toContain("backdrop-filter");
    expect(output).not.toContain("blur");
    expect(output).toContain("background:rgba(0,0,0,0.5)");
  });

  it("neutralizes dangerous fixed and blur rules inside <style> blocks", () => {
    const input = `<style>
      body { filter: blur(4px); }
      .layer { position: fixed; inset: 0; backdrop-filter: blur(12px); }
      .normal { color: red; }
    </style><div>Content</div>`;
    const output = sanitizeInboundEmailHtml(input);
    expect(output).not.toContain("position: fixed");
    expect(output).not.toContain("backdrop-filter");
    expect(output).not.toContain("blur(4px)");
    expect(output).not.toContain("blur(12px)");
    expect(output).toContain("color: red");
  });

  it("forces target='_blank' and rel='noopener noreferrer' on links", () => {
    const input = `<p>Click <a href="https://example.com">here</a> for details.</p>`;
    const output = sanitizeInboundEmailHtml(input);
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain('href="https://example.com"');
  });

  it("preserves standard email layout, headings, and tables", () => {
    const input = `
      <h1>Invoice #1234</h1>
      <table style="width: 100%;">
        <tr><td>Item 1</td><td>$50.00</td></tr>
      </table>
      <p>Thank you for your business!</p>
    `;
    const output = sanitizeInboundEmailHtml(input);
    expect(output).toContain("<h1>Invoice #1234</h1>");
    expect(output).toContain("<table");
    expect(output).toContain("Item 1");
    expect(output).toContain("$50.00");
  });
});
