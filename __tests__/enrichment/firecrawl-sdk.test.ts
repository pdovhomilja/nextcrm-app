import FirecrawlApp, { SdkError, type Document, type SearchData } from "@mendable/firecrawl-js";
import type { FunctionTool } from "@openai/agents";
import { createSmartSearchTool } from "@/lib/enrichment/agent-architecture/tools/smart-search-tool";
import { createWebsiteScraperTool } from "@/lib/enrichment/agent-architecture/tools/website-scraper-tool";
import { FirecrawlService } from "@/lib/enrichment/services/firecrawl";
import { createCompanyAgent } from "@/lib/enrichment/services/specialized-agents";

// The SDK is mocked at its client methods; fixtures are checked against the
// SDK's own types, so a shape change in a later SDK version fails to compile.
const mockSearch = jest.fn();
const mockScrape = jest.fn();

jest.mock("@mendable/firecrawl-js", () => ({
  ...jest.requireActual("@mendable/firecrawl-js"),
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    search: mockSearch,
    scrape: mockScrape,
  })),
}));

const webItem = {
  url: "https://acme.test/about",
  title: "About Acme",
  description: "Acme makes anvils",
  markdown: "# Acme\nAnvils since 2025",
  html: "<h1>Acme</h1>",
  links: ["https://acme.test/team"],
  metadata: {
    title: "About Acme | Home",
    description: "Meta description of Acme, long enough to be used",
    sourceURL: "https://acme.test/about",
    statusCode: 200,
  },
};
const searchData = { web: [webItem] } satisfies SearchData;

const scrapedDoc = {
  markdown: "# Acme\nWe build anvils for the whole wide world",
  html: "<h1>Acme</h1>",
  metadata: {
    title: "Acme | Home",
    description: "Meta description of Acme, long enough to be used",
    sourceURL: "https://acme.test",
    statusCode: 200,
  },
} satisfies Document;

beforeEach(() => {
  mockSearch.mockReset();
  mockScrape.mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("FirecrawlService.search", () => {
  const service = () => new FirecrawlService("fc-test");

  it("gives callers the same fields from a 4.x web result", async () => {
    mockSearch.mockResolvedValue(searchData);

    await expect(service().search("acme")).resolves.toEqual([
      {
        url: webItem.url,
        title: webItem.title,
        description: webItem.description,
        markdown: webItem.markdown,
        html: webItem.html,
        links: webItem.links,
        metadata: webItem.metadata,
      },
    ]);
  });

  it("asks for the scraped formats and the plain description", async () => {
    mockSearch.mockResolvedValue(searchData);

    await service().search("acme", { limit: 3 });

    expect(mockSearch).toHaveBeenCalledWith("acme", {
      limit: 3,
      highlights: false,
      scrapeOptions: { formats: ["markdown", "links", "html"] },
    });
  });

  it("leaves scrapeOptions out when content is not wanted", async () => {
    mockSearch.mockResolvedValue({
      web: [{ url: webItem.url, title: webItem.title, description: webItem.description }],
    } satisfies SearchData);

    const results = await service().search("acme", { scrapeContent: false });

    expect(mockSearch).toHaveBeenCalledWith("acme", { limit: 5, highlights: false });
    expect(results[0].url).toBe(webItem.url);
    expect(results[0].markdown).toBeUndefined();
  });

  it("returns no results when the response has no web group", async () => {
    mockSearch.mockResolvedValue({} satisfies SearchData);

    await expect(service().search("acme")).resolves.toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("retries on a retryable SdkError status", async () => {
    mockSearch
      .mockRejectedValueOnce(new SdkError("busy", 503))
      .mockResolvedValueOnce(searchData);

    const results = await service().search("acme");

    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
  });

  it("does not retry on a client error and returns no results", async () => {
    mockSearch.mockRejectedValue(new SdkError("bad key", 401));

    await expect(service().search("acme")).resolves.toEqual([]);
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates by url across queries", async () => {
    mockSearch.mockResolvedValue(searchData);

    const results = await service().searchWithMultipleQueries(["a", "b"]);

    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(results.map((r) => r.url)).toEqual([webItem.url]);
  });
});

describe("FirecrawlService.scrapeUrl", () => {
  const service = () => new FirecrawlService("fc-test");

  it("scrapes with the same options and adds the protocol", async () => {
    mockScrape.mockResolvedValue(scrapedDoc);

    await service().scrapeUrl("acme.test");

    expect(mockScrape).toHaveBeenCalledWith("https://acme.test", {
      formats: ["markdown", "html"],
      timeout: 30000,
      autoResume: false,
    });
  });

  it("keeps the v1 runtime shape: fields at the top level, no data wrapper", async () => {
    mockScrape.mockResolvedValue(scrapedDoc);

    const result = await service().scrapeUrl("https://acme.test");

    expect(result.markdown).toBe(scrapedDoc.markdown);
    expect(result.html).toBe(scrapedDoc.html);
    expect(result.metadata).toEqual(scrapedDoc.metadata);
    expect(result.data).toBeUndefined();
  });

  it("retries on a retryable SdkError status", async () => {
    mockScrape
      .mockRejectedValueOnce(new SdkError("busy", 503))
      .mockResolvedValueOnce(scrapedDoc);

    const result = await service().scrapeUrl("https://acme.test");

    expect(mockScrape).toHaveBeenCalledTimes(2);
    expect(result.markdown).toBe(scrapedDoc.markdown);
  });

  it("retries an SSL error with skipTlsVerification", async () => {
    mockScrape
      .mockRejectedValueOnce(new SdkError("SSL error: bad certificate", 500))
      .mockResolvedValueOnce(scrapedDoc);

    await service().scrapeUrl("https://acme.test");

    expect(mockScrape).toHaveBeenLastCalledWith("https://acme.test", {
      formats: ["markdown", "html"],
      skipTlsVerification: true,
      timeout: 30000,
      autoResume: false,
    });
  });

  it("rethrows a client error", async () => {
    mockScrape.mockRejectedValue(new SdkError("not allowed", 403));

    await expect(service().scrapeUrl("https://acme.test")).rejects.toThrow("not allowed");
    expect(mockScrape).toHaveBeenCalledTimes(1);
  });
});

describe("createSmartSearchTool", () => {
  it("returns url, title, content, domain from a 4.x web result", async () => {
    mockSearch.mockResolvedValue(searchData);
    const tool = createSmartSearchTool("fc-test", "discovery");

    const results = await tool.execute({ queries: ["acme"], targetField: "companyName" });

    expect(mockSearch).toHaveBeenCalledWith("acme", {
      limit: 3,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
    expect(results).toEqual([
      {
        url: webItem.url,
        title: webItem.title,
        content: webItem.markdown,
        relevance: expect.any(Number),
        domain: "acme.test",
      },
    ]);
  });

  it("returns nothing when the response has no web group", async () => {
    mockSearch.mockResolvedValue({} satisfies SearchData);
    const tool = createSmartSearchTool("fc-test", "business");

    await expect(
      tool.execute({ queries: ["acme"], targetField: "industry" })
    ).resolves.toEqual([]);
  });
});

describe("createWebsiteScraperTool", () => {
  it("returns extracted fields, raw content and metadata from a 4.x Document", async () => {
    mockScrape.mockResolvedValue(scrapedDoc);
    const tool = createWebsiteScraperTool("fc-test");

    const result = await tool.execute({
      url: "https://acme.test",
      targetFields: ["companyName", "description"],
    });

    expect(mockScrape).toHaveBeenCalledWith("https://acme.test", {
      formats: ["markdown", "html"],
      onlyMainContent: true,
      waitFor: 2000,
    });
    expect(result).toEqual({
      url: "https://acme.test",
      extractedData: { companyName: "Acme", description: scrapedDoc.metadata.description },
      rawContent: scrapedDoc.markdown,
      metadata: scrapedDoc.metadata,
    });
  });

  it("reports a thrown SDK error in the result", async () => {
    mockScrape.mockRejectedValue(new SdkError("blocked", 403));
    const tool = createWebsiteScraperTool("fc-test");

    await expect(
      tool.execute({ url: "https://acme.test", targetFields: [] })
    ).resolves.toEqual({ url: "https://acme.test", error: "blocked", extractedData: {} });
  });
});

describe("specialized search tool", () => {
  it("returns title, url and description from a 4.x web result", async () => {
    mockSearch.mockResolvedValue(searchData);
    const agent = createCompanyAgent(new FirecrawlApp({ apiKey: "fc-test" }));
    const tool = agent.tools[0] as FunctionTool;

    const results = await tool.invoke(
      {} as Parameters<FunctionTool["invoke"]>[0],
      JSON.stringify({ queries: ["acme"], scrapeContent: false })
    );

    expect(mockSearch).toHaveBeenCalledWith("acme", { limit: 3, highlights: false });
    expect(results).toEqual([
      { title: webItem.title, url: webItem.url, content: webItem.description },
    ]);
  });
});
