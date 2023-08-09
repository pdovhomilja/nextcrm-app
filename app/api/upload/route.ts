import { join } from "path";
import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  const data = await request.formData();
  const file: File | null = data.get("file") as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  console.log(buffer, "buffer");

  // With the file data in the buffer, you can do whatever you want with it.
  // For this, we'll just write it to the filesystem in a new location
  //const path = `/tmp/${file.name}`;
  //const path = join(process.cwd(), "public", "tmp", file.name);
  //await writeFile(path, buffer);
  //console.log(`open ${path} to see the uploaded file`);

  //Rossum integration
  const rossumURL = process.env.ROSSUM_API_URL;
  const queueId = process.env.ROSSUM_QUEUE_ID;
  const queueUploadUrl = `${rossumURL}/queues/${queueId}/upload`;
  const username = process.env.ROSSUM_USER;
  const password = process.env.ROSSUM_PASS;

  //const dataBuffer = await fs.promises.readFile(path); // Read the file using promises

  //console.log(dataBuffer, "dataBuffer");

  const form = new FormData();
  form.append("content", buffer, file.name); // Append dataBuffer to the form

  let rossumDocument;
  let rossumAnnotation;

  try {
    const response = await fetch(queueUploadUrl, {
      method: "POST",
      body: form,
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
          "base64"
        )}`,
      },
    });

    if (response.ok) {
      const responseData = await response.json();
      const {
        results: [{ annotation, document }],
      } = responseData;
      console.log(
        `The file-annotation is reachable at the following URL: ${annotation}`
      );
      console.log(
        `The file-document is reachable at the following URL: ${document}`
      );

      rossumDocument = document;
      rossumAnnotation = annotation;
    } else {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.log("Was not able to upload the document...", err);
  }

  const bucketParams = {
    Bucket: process.env.DO_BUCKET,
    Key: file.name,
    Body: buffer,
    ContentType: file.type,
    ContentDisposition: "inline",
    ACL: "public-read",
  };

  await s3Client.send(new PutObjectCommand(bucketParams));

  //S3 bucket url for the invoice
  const url = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${file.name}`;
  //console.log(url, "url");
  const rossumDocumentId = rossumDocument.split("/").slice(-1)[0];
  const rossumAnnotationId = rossumAnnotation.split("/").slice(-1)[0];
  //Save the data to the database

  const invoice = await prismadb.invoices.create({
    data: {
      last_updated_by: session.user.id,
      date_due: new Date(),
      description: "Invoice description",
      document_type: "invoice",
      invoice_type: "Taxable document",
      status: "new",
      favorite: false,
      assigned_user_id: session.user.id,
      invoice_file_url: url,
      invoice_file_mimeType: file.type,
      rossum_document_url: rossumDocument,
      rossum_document_id: rossumDocumentId,
      rossum_annotation_url: rossumAnnotation,
      rossum_annotation_id: rossumAnnotationId,
    },
  });

  //delete file from tmp folder after 5 seconds
  /*   setTimeout(() => {
    fs.unlink(path, (err: any) => {
      if (err) {
        console.error(err);
        return;
      }
      //file removed
      console.log(path, "deleted");
    });
  }, 5000); */

  return NextResponse.json({ success: true });
}
