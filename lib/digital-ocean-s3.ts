import { GetObjectCommand, S3, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (!process.env.DO_ENDPOINT) {
  throw new Error("DO_ENDPOINT is not defined");
}
if (!process.env.DO_REGION) {
  throw new Error("DO_REGION is not defined");
}
if (!process.env.DO_ACCESS_KEY_ID) {
  throw new Error("DO_ACCESS_KEY_ID is not defined");
}
if (!process.env.DO_ACCESS_KEY_SECRET) {
  throw new Error("DO_ACCESS_KEY_SECRET is not defined");
}

const s3Client = new S3({
  //forcePathStyle: false, // Configures to use subdomain/virtual calling format.
  endpoint: process.env.DO_ENDPOINT,
  region: process.env.DO_REGION,
  credentials: {
    accessKeyId: process.env.DO_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_ACCESS_KEY_SECRET,
  },
});

export { s3Client };
