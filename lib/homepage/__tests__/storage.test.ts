const send = jest.fn();
jest.mock("@/lib/minio", () => ({ minioClient: { send }, MINIO_BUCKET: "bucket" }));
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  homepageHtmlKey, homepageShotKey, putHomepageHtml, getHomepageHtml,
  homepageTmpSourceKey, putHomepageTmpSource, deleteHomepageTmpSource,
  homepageUploadKey, putHomepageUpload, getHomepageUpload, deleteHomepageUpload,
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

it("upload key is transient under previews/<slug>/tmp/ and distinct from every other key", () => {
  expect(homepageUploadKey("acme")).toBe("previews/acme/tmp/upload.html");
  expect(homepageUploadKey("acme")).not.toBe(homepageHtmlKey("acme"));
  expect(homepageUploadKey("acme")).not.toBe(homepageShotKey("acme"));
  expect(homepageUploadKey("acme")).not.toBe(homepageTmpSourceKey("acme"));
});

it("upload helpers put, get (utf-8 round-trip) and delete at the transient key", async () => {
  const html = "<h1>héllo ✓</h1>";
  send.mockResolvedValue({});
  await putHomepageUpload("acme", html);
  const put = send.mock.calls[0][0];
  expect(put).toBeInstanceOf(PutObjectCommand);
  expect(put.input).toMatchObject({
    Bucket: "bucket", Key: "previews/acme/tmp/upload.html", Body: html, ContentType: "text/html; charset=utf-8",
  });

  send.mockResolvedValueOnce({
    Body: (async function* () { yield Buffer.from(html, "utf-8"); })(),
  });
  expect(await getHomepageUpload("acme")).toBe(html);
  const get = send.mock.calls[1][0];
  expect(get).toBeInstanceOf(GetObjectCommand);
  expect(get.input).toMatchObject({ Bucket: "bucket", Key: "previews/acme/tmp/upload.html" });

  send.mockResolvedValueOnce({});
  await deleteHomepageUpload("acme");
  const del = send.mock.calls[2][0];
  expect(del).toBeInstanceOf(DeleteObjectCommand);
  expect(del.input).toMatchObject({ Bucket: "bucket", Key: "previews/acme/tmp/upload.html" });
});

it("getHomepageUpload returns null on NoSuchKey", async () => {
  send.mockRejectedValue(Object.assign(new Error("x"), { name: "NoSuchKey" }));
  expect(await getHomepageUpload("nope")).toBeNull();
});
