import { parsePlainTextThread } from "@/lib/email/parse-thread";

describe("parsePlainTextThread", () => {
  it("splits nested On-wrote replies", () => {
    const text = `latest reply

On Sun, Oct 11, 2026 at 9:23 PM user <a@b.com> wrote:
Hello bro

On Sun, Oct 11, 2026 at 9:22 PM ceo <ceo@vensailabs.in> wrote:
hello bro`;

    const parts = parsePlainTextThread(text);
    expect(parts[0]).toMatchObject({ kind: "message", body: "latest reply" });
    expect(parts[1]?.kind).toBe("quote");
    expect(parts[1]?.body).toContain("Hello bro");
    expect(parts[2]?.kind).toBe("quote");
    expect(parts[2]?.body).toContain("hello bro");
  });
});
