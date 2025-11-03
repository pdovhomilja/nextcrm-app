import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { PutObjectAclCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios from "axios";
import { getRossumToken } from "@/lib/get-rossum-token";

const FormData = require("form-data");

export async function POST(request: NextRequest) {
  // Parse the request body as JSON instead of FormData
  const { file } = await request.json();

  if (!file) {
    console.error("[UPLOAD_CRON] No file found in request");
    return NextResponse.json({ success: false });
  }

  //Rossum integration
  const rossumURL = process.env.ROSSUM_API_URL;
  const queueId = process.env.ROSSUM_QUEUE_ID;
  const queueUploadUrl = `${rossumURL}/uploads?queue=${queueId}`;

  const token = await getRossumToken();

  const buffer = Buffer.from(file.content.data, "base64");

  const form = new FormData();
  form.append("content", buffer, file.filename);

  const uploadInvoiceToRossum = await axios.post(queueUploadUrl, form, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const rossumTask = await axios.get(uploadInvoiceToRossum.data.url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const rossumUploadData = await axios.get(rossumTask.data.content.upload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const rossumDocument = await axios.get(rossumUploadData.data.documents[0], {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (rossumDocument.status !== 200) {
    throw new Error("Could not get Rossum document");
  }

  const invoiceFileName =
    "invoices/" + new Date().getTime() + "-" + file.filename;
  try {
    const bucketParams = {
      Bucket: process.env.DO_BUCKET,
      Key: invoiceFileName,
      Body: Buffer.from(file.content.data),
      ContentType: file.contentType,
      ContentDisposition: "inline",

      ACL: "public-read" as const,
    };

    await s3Client.send(new PutObjectCommand(bucketParams));
  } catch (err) {
    console.error("[UPLOAD_CRON] Error uploading to S3:", err);
  }
  try {
    const url = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${invoiceFileName}`;

    const rossumAnnotationId = rossumDocument.data.annotations[0]
      .split("/")
      .pop();
    //Save the data to the database

    const admin = await prismadb.users.findMany({
      where: {
        is_admin: true,
      },
    });

    if (!admin[0] || !admin[0].organizationId) {
      throw new Error("Admin user or organization not found");
    }

    await prismadb.invoices.create({
      data: {
        organizationId: admin[0].organizationId,
        last_updated_by: admin[0].id,
        date_due: new Date(),
        description: "Incoming invoice",
        document_type: "invoice",
        invoice_type: "Taxable document",
        status: "new",
        favorite: false,
        assigned_user_id: admin[0].id,
        invoice_file_url: url,
        invoice_file_mimeType: file.contentType,
        rossum_status: "importing",
        rossum_document_url: rossumDocument.data.annotations[0],
        rossum_document_id: rossumDocument.data.id.toString(),
        rossum_annotation_url: rossumDocument.data.annotations[0],
        rossum_annotation_id: rossumAnnotationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPLOAD_CRON] Error storing invoice data:", error);
    return NextResponse.json({ success: false });
  }
}
