import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import {
  BucketAlreadyExists,
  ListBucketsCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest, props: { params: Promise<{ bucketId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  const { bucketId } = params;

  if (!bucketId) {
    return NextResponse.json("No bucketId ", { status: 400 });
  }

  const bucketParams = { Bucket: bucketId };

  const data = await s3Client.send(new ListObjectsCommand(bucketParams));
  console.log("Success", data);

  return NextResponse.json({ files: data, success: true }, { status: 200 });
}
