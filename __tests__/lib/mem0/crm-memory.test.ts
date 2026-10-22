import {
  appendMemoriesToSystem,
  recallMemoriesForPrompt,
} from "@/lib/mem0/crm-memory";

describe("mem0 crm-memory", () => {
  const prev = process.env.MEM0_API_KEY;

  afterEach(() => {
    process.env.MEM0_API_KEY = prev;
  });

  it("appendMemoriesToSystem leaves system unchanged when memories empty", () => {
    expect(appendMemoriesToSystem("base", "")).toBe("base");
    expect(appendMemoriesToSystem("base", "   ")).toBe("base");
  });

  it("recallMemoriesForPrompt is a no-op without MEM0_API_KEY", async () => {
    delete process.env.MEM0_API_KEY;
    const out = await recallMemoriesForPrompt({
      userId: "u1",
      query: "hello",
      surface: "assistant",
    });
    expect(out).toBe("");
  });
});
