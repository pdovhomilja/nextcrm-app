const send = jest.fn();
jest.mock("@/lib/minio", () => ({ minioClient: { send }, MINIO_BUCKET: "bucket" }));
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  homepageImageKey, homepageImageUrl, detectImageContentType,
  putHomepageImage, getHomepageImage, getHomepageImageBuffer,
} from "@/lib/homepage/storage";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP")]);
const GIF = Buffer.from("GIF89a");

const bodyOf = (b: Buffer) => (async function* () { yield new Uint8Array(b); })();

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL;
});

it("image key is under previews/<slug>/images", () => {
  expect(homepageImageKey("acme", "img-1.png")).toBe("previews/acme/images/img-1.png");
});

it("image url honors NEXT_PUBLIC_PREVIEWS_BASE_URL, else relative", () => {
  process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "https://previews.example.com/";
  expect(homepageImageUrl("acme", "img-1.png")).toBe("https://previews.example.com/p/acme/images/img-1.png");
  delete process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL;
  expect(homepageImageUrl("acme", "img-1.png")).toBe("/p/acme/images/img-1.png");
});

describe("detectImageContentType", () => {
  it("detects png, jpeg, webp, gif from magic bytes", () => {
    expect(detectImageContentType(PNG)).toBe("image/png");
    expect(detectImageContentType(JPEG)).toBe("image/jpeg");
    expect(detectImageContentType(WEBP)).toBe("image/webp");
    expect(detectImageContentType(GIF)).toBe("image/gif");
  });
  it("falls back to application/octet-stream for unknown/short input", () => {
    expect(detectImageContentType(Buffer.from("hello world"))).toBe("application/octet-stream");
    expect(detectImageContentType(Buffer.alloc(0))).toBe("application/octet-stream");
    expect(detectImageContentType(Buffer.from([0x89]))).toBe("application/octet-stream");
  });
});

describe("putHomepageImage", () => {
  it("stores a JPEG with the DETECTED image/jpeg content-type (not png)", async () => {
    send.mockResolvedValue({});
    await putHomepageImage("acme", "img-1.jpg", JPEG);
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input).toMatchObject({
      Bucket: "bucket", Key: "previews/acme/images/img-1.jpg", ContentType: "image/jpeg",
    });
  });
  it("stores a PNG as image/png", async () => {
    send.mockResolvedValue({});
    await putHomepageImage("acme", "img-1.png", PNG);
    expect(send.mock.calls[0][0].input).toMatchObject({ ContentType: "image/png" });
  });
});

describe("getHomepageImage", () => {
  it("returns buffer + stored ContentType from the S3 response", async () => {
    send.mockResolvedValue({ Body: bodyOf(JPEG), ContentType: "image/jpeg" });
    const res = await getHomepageImage("acme", "img-1.jpg");
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "bucket", Key: "previews/acme/images/img-1.jpg" });
    expect(res).toEqual({ buffer: JPEG, contentType: "image/jpeg" });
  });
  it("falls back to detected type when the metadata is absent", async () => {
    send.mockResolvedValue({ Body: bodyOf(JPEG) });
    expect((await getHomepageImage("acme", "x.jpg"))?.contentType).toBe("image/jpeg");
  });
  it("returns null on NoSuchKey", async () => {
    send.mockRejectedValue(Object.assign(new Error("x"), { name: "NoSuchKey" }));
    expect(await getHomepageImage("acme", "x.png")).toBeNull();
  });
  it("getHomepageImageBuffer returns just the buffer", async () => {
    send.mockResolvedValue({ Body: bodyOf(PNG), ContentType: "image/png" });
    expect(await getHomepageImageBuffer("acme", "x.png")).toEqual(PNG);
  });
});
