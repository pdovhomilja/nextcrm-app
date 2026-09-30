const send = jest.fn();
jest.mock("@/lib/minio", () => ({ minioClient: { send }, MINIO_BUCKET: "bucket" }));
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  homepageHtmlKey, homepageShotKey, putHomepageHtml, getHomepageHtml,
  homepageTmpSourceKey, putHomepageTmpSource, deleteHomepageTmpSource,
} from "@/lib/homepage/storage";

beforeEach(() => jest.clearAllMocks());

it("keys are slug-scoped under previews/", () => {
  expect(homepageHtmlKey("acme")).toBe("previews/acme/index.html");
  expect(homepageShotKey("acme")).toBe("previews/acme/screenshot.png");
});

it("uploads html with text/html content-type", async () => {
  send.mockResolvedValue({});
  await putHomepageHtml("acme", "<h1>hi</h1>");
  const cmd = send.mock.calls[0][0];
  expect(cmd).toBeInstanceOf(PutObjectCommand);
  expect(cmd.input).toMatchObject({ Bucket: "bucket", Key: "previews/acme/index.html", ContentType: "text/html; charset=utf-8" });
});

it("getHomepageHtml returns null on NoSuchKey", async () => {
  send.mockRejectedValue(Object.assign(new Error("x"), { name: "NoSuchKey" }));
  expect(await getHomepageHtml("nope")).toBeNull();
});

it("transient source screenshot lives under previews/<slug>/tmp/ (never a served key)", async () => {
  expect(homepageTmpSourceKey("acme")).toBe("previews/acme/tmp/source.png");
  expect(homepageTmpSourceKey("acme")).not.toBe(homepageShotKey("acme"));
  send.mockResolvedValue({});
  await putHomepageTmpSource("acme", Buffer.from("x"));
  expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
  expect(send.mock.calls[0][0].input).toMatchObject({ Key: "previews/acme/tmp/source.png", ContentType: "image/png" });
  await deleteHomepageTmpSource("acme");
  expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
  expect(send.mock.calls[1][0].input).toMatchObject({ Bucket: "bucket", Key: "previews/acme/tmp/source.png" });
});
