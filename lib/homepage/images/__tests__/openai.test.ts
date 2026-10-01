import { openaiProvider } from "@/lib/homepage/images/openai";

const KEY = "OPENAI_API_KEY";
const BASE = "OPENAI_BASE_URL";
const spec = {
  token: "__RADE_IMG_1__",
  role: "hero" as const,
  prompt: "p",
  alt: "a",
  aspectRatio: "16:9" as const,
};

const okResponse = (b64: string) =>
  ({ ok: true, json: async () => ({ data: [{ b64_json: b64 }] }) }) as unknown as Response;

beforeEach(() => {
  process.env[KEY] = "sk-x";
  delete process.env[BASE];
  jest.restoreAllMocks();
});
afterEach(() => {
  delete process.env[KEY];
  delete process.env[BASE];
});

it("isConfigured reflects the key", () => {
  expect(openaiProvider().isConfigured()).toBe(true);
  delete process.env[KEY];
  expect(openaiProvider().isConfigured()).toBe(false);
});

it("fails closed without a key: throws 'not configured' and never calls fetch", async () => {
  delete process.env[KEY];
  const fetchMock = jest.spyOn(global, "fetch");
  await expect(openaiProvider().generateImage(spec)).rejects.toThrow(/not configured/);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("returns the decoded PNG bytes from b64_json and maps 16:9 to a landscape size", async () => {
  const b64 = Buffer.from("PNGDATA").toString("base64");
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce(okResponse(b64));
  const out = await openaiProvider().generateImage(spec);
  expect(Buffer.isBuffer(out)).toBe(true);
  expect(out.toString()).toBe("PNGDATA");

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("https://api.openai.com/v1/images/generations");
  expect(init.method).toBe("POST");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-x");
  expect(init.signal).toBeInstanceOf(AbortSignal);
  const body = JSON.parse(init.body as string);
  expect(body).toEqual({ model: "gpt-image-1", prompt: "p", size: "1536x1024", n: 1 });
});

it("maps 4:5 to a portrait size", async () => {
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockResolvedValueOnce(okResponse(Buffer.from("x").toString("base64")));
  await openaiProvider().generateImage({ ...spec, aspectRatio: "4:5" });
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(body.size).toBe("1024x1536");
});

it("honors the OPENAI_BASE_URL test seam", async () => {
  process.env[BASE] = "http://127.0.0.1:9999";
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockResolvedValueOnce(okResponse(Buffer.from("x").toString("base64")));
  await openaiProvider().generateImage(spec);
  expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:9999/v1/images/generations");
});

it("throws on a non-ok response", async () => {
  jest
    .spyOn(global, "fetch")
    .mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad" } as unknown as Response);
  await expect(openaiProvider().generateImage(spec)).rejects.toThrow(/400/);
});

it("throws when the response carries no b64_json", async () => {
  jest
    .spyOn(global, "fetch")
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{}] }) } as unknown as Response);
  await expect(openaiProvider().generateImage(spec)).rejects.toThrow(/no b64_json/);
});
