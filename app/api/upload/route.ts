import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { PutObjectAclCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios from "axios";
import { getRossumToken } from "@/lib/get-rossum-token";
import { canUploadFile } from "@/lib/quota-enforcement";

const FormData = require("form-data");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  const data = await request.formData();
  const file: File | null = data.get("file") as unknown as File;

  if (!file) {
    console.error("[UPLOAD_API] No file found in request");
    return NextResponse.json({ success: false });
  }
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Check storage quota before uploading
  if (!session.user.organizationId) {
    return NextResponse.json("User organization not found", { status: 401 });
  }

  const quotaCheck = await canUploadFile(
    session.user.organizationId,
    buffer.length
  );
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      {
        error: quotaCheck.reason || "Storage limit reached",
        requiresUpgrade: true,
        code: "QUOTA_EXCEEDED",
      },
      { status: 403 }
    );
  }

  //Rossum integration
  const rossumURL = process.env.ROSSUM_API_URL;
  const queueId = process.env.ROSSUM_QUEUE_ID;
  const queueUploadUrl = `${rossumURL}/uploads?queue=${queueId}`;
  const token = await getRossumToken();

  const form = new FormData();
  form.append("content", buffer, file.name);

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

  const invoiceFileName = "invoices/" + new Date().getTime() + "-" + file.name;
  try {
    const bucketParams = {
      Bucket: process.env.DO_BUCKET,
      Key: invoiceFileName,
      Body: buffer,
      ContentType: file.type,
      ContentDisposition: "inline",
      ACL: "public-read" as const,
    };

    await s3Client.send(new PutObjectCommand(bucketParams));
  } catch (err) {
    console.error("[UPLOAD_API] Error uploading to S3:", err);
  }
  try {
    //S3 bucket url for the invoice
    const url = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${invoiceFileName}`;

    const rossumAnnotationId = rossumDocument.data.annotations[0]
      .split("/")
      .pop();
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
        rossum_document_url: rossumDocument.data.annotations[0],
        rossum_document_id: rossumDocument.data.id.toString(),
        rossum_annotation_url: rossumDocument.data.annotations[0],
        rossum_annotation_id: rossumAnnotationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPLOAD_API] Error storing invoice data:", error);
    return NextResponse.json({ success: false });
  }
}
