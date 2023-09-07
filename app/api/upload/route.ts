import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

//const fs = require("fs");
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
  //console.log(buffer, "buffer");

  //Rossum integration
  const rossumURL = process.env.ROSSUM_API_URL;
  const queueId = process.env.ROSSUM_QUEUE_ID;
  const queueUploadUrl = `${rossumURL}/queues/${queueId}/upload`;
  const username = process.env.ROSSUM_USER;
  const password = process.env.ROSSUM_PASS;

  const form = new FormData();
  form.append("content", buffer, file.name);

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

    //console.log(response, "response");
    if (response.ok) {
      const responseData = await response.json();
      console.log(responseData, "responseData");

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
  const invoiceFileName = "invoices/" + new Date().getTime() + "-" + file.name;

  const bucketParams = {
    Bucket: process.env.DO_BUCKET,
    Key: invoiceFileName,
    Body: buffer,
    ContentType: file.type,
    ContentDisposition: "inline",
    ACL: "public-read",
  };

  try {
    await s3Client.send(new PutObjectCommand(bucketParams));
    console.log(data, "data");
  } catch (err) {
    console.log("Error - uploading to S3(Digital Ocean)", err);
  }

  try {
    //S3 bucket url for the invoice
    const url = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${invoiceFileName}`;
    //console.log(url, "url");
    const rossumDocumentId = rossumDocument.split("/").slice(-1)[0];
    const rossumAnnotationId = rossumAnnotation.split("/").slice(-1)[0];
    //Save the data to the database

    await prismadb.invoices.create({
      data: {
        last_updated_by: session.user.id,
        date_due: new Date(),
        description: "Incoming invoice",
        document_type: "invoice",
        invoice_type: "Taxable document",
        status: "new",
        favorite: false,
        assigned_user_id: session.user.id,
        invoice_file_url: url,
        invoice_file_mimeType: file.type,
        rossum_status: "importing",
        rossum_document_url: rossumDocument,
        rossum_document_id: rossumDocumentId,
        rossum_annotation_url: rossumAnnotation,
        rossum_annotation_id: rossumAnnotationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("Error - storing data to DB", error);
    return NextResponse.json({ success: false });
  }
}
