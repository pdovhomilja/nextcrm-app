import getGithubRepoStars from "@/actions/github/get-repo-stars";

describe("getGithubRepoStars", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  it("fetches the star count with no Authorization header (no token exposed)", async () => {
    const fn = jest
      .fn()
      .mockResolvedValue({ json: async () => ({ stargazers_count: 42 }) });
    global.fetch = fn as unknown as typeof fetch;

    const stars = await getGithubRepoStars();

    expect(stars).toBe(42);
    const headers = (fn.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("returns 0 without throwing on a fetch error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    await expect(getGithubRepoStars()).resolves.toBe(0);
  });
});
