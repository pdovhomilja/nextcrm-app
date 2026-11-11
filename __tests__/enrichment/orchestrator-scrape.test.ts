import type { Document } from "@mendable/firecrawl-js";
import { AgentOrchestrator } from "@/lib/enrichment/agent-architecture/orchestrator";
import type { EnrichmentField } from "@/lib/enrichment/types";

// FirecrawlService and OpenAIService are mocked at their public methods. The
// scrape fixture is a real SDK v4 Document (fields at the top level, page
// metadata under `metadata`), checked against the SDK's own type.
const mockScrapeUrl = jest.fn();
const mockSearch = jest.fn();
const mockExtract = jest.fn();

jest.mock("@/lib/enrichment/services/firecrawl", () => ({
  FirecrawlService: jest.fn().mockImplementation(() => ({
    scrapeUrl: mockScrapeUrl,
    search: mockSearch,
  })),
}));

jest.mock("@/lib/enrichment/services/openai", () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    extractStructuredDataWithCorroboration: mockExtract,
  })),
}));

const homepage = {
  // isValidCompanyWebsite needs at least 200 chars of markdown.
  markdown:
    "# Acme Anvils\nWe build anvils for workshops. Our team ships products worldwide. Contact us for a quote on any of our anvil models, from the small bench anvil to the large farrier anvil. Every anvil is forged by hand.",
  html: '<html><head><meta name="generator" content="WordPress 6.5"></head><body>Acme</body></html>',
  metadata: {
    title: "Acme Anvils | Home",
    description: "Acme Anvils makes forged anvils for workshops in Europe.",
    sourceURL: "https://acme.test",
    statusCode: 200,
  },
} satisfies Document;

const field = (name: string, description: string): EnrichmentField => ({
  name,
  displayName: name,
  description,
  type: "string",
  required: false,
});

function enrich(fields: EnrichmentField[]) {
  return new AgentOrchestrator("fc-key", "oa-key").enrichRow(
    { email: "jane@acme.test" },
    fields,
    "email",
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  mockSearch.mockResolvedValue([]);
  mockExtract.mockResolvedValue({});
  mockScrapeUrl.mockResolvedValue(homepage);
});

describe("AgentOrchestrator uses the scraped website", () => {
  it("discovery fills name, website and description from the homepage without searching", async () => {
    const result = await enrich([
      field("company_name", "The company name"),
      field("website", "Company website"),
      field("company_description", "Company description"),
    ]);

    expect(mockScrapeUrl).toHaveBeenCalledTimes(1);
    expect(mockScrapeUrl).toHaveBeenCalledWith("https://acme.test");
    expect(result.enrichments).toMatchObject({
      company_name: { value: "Acme Anvils", source: "https://acme.test" },
      website: { value: "https://acme.test", source: "https://acme.test" },
      company_description: {
        value: "Acme Anvils makes forged anvils for workshops in Europe.",
        source: "https://acme.test",
      },
    });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("tech stack phase reads the homepage HTML", async () => {
    await enrich([field("tech_stack", "Technologies the company uses")]);

    expect(mockScrapeUrl).toHaveBeenCalledTimes(1);
    expect(mockScrapeUrl).toHaveBeenCalledWith("https://acme.test");
    expect(mockExtract).toHaveBeenCalledTimes(1);
    const content: string = mockExtract.mock.calls[0][0];
    expect(content).toContain("DETECTED TECHNOLOGIES FROM HTML ANALYSIS");
    expect(content).toContain("WordPress");
  });

  it("general phase uses the first leadership page that scrapes and stops there", async () => {
    const aboutPage = {
      markdown: "# About Acme\nJane Smith is our CEO and founder.",
      metadata: { sourceURL: "https://acme.test/about", statusCode: 200 },
    } satisfies Document;
    mockScrapeUrl.mockResolvedValue(aboutPage);

    await enrich([field("ceo_name", "Name of the CEO")]);

    expect(mockScrapeUrl).toHaveBeenCalledTimes(1);
    expect(mockScrapeUrl).toHaveBeenCalledWith("https://acme.test/about");
    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(mockExtract.mock.calls[0][0]).toContain("Jane Smith is our CEO and founder.");
  });
});
