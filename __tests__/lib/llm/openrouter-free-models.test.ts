import {
  DEFAULT_OPENROUTER_FREE_MODELS,
  openRouterModelsToTry,
} from "@/lib/llm/openrouter-free-models";

describe("openRouterModelsToTry", () => {
  const orig = process.env.LLM_OPENROUTER_FREE_MODELS;

  afterEach(() => {
    if (orig === undefined) delete process.env.LLM_OPENROUTER_FREE_MODELS;
    else process.env.LLM_OPENROUTER_FREE_MODELS = orig;
  });

  it("includes user primary free models in defaults", () => {
    const models = openRouterModelsToTry();
    expect(models[0]).toBe("google/gemini-2.0-flash-exp:free");
    expect(models[1]).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(models.length).toBeGreaterThanOrEqual(2);
  });

  it("respects LLM_OPENROUTER_FREE_MODELS env", () => {
    process.env.LLM_OPENROUTER_FREE_MODELS = "a:free,b:free";
    expect(openRouterModelsToTry()).toEqual(["a:free", "b:free"]);
  });

  it("exports stable default list", () => {
    expect(DEFAULT_OPENROUTER_FREE_MODELS).toContain("google/gemini-2.0-flash-exp:free");
  });
});
