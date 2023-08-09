import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  const buckets = await s3Client.send(new ListBucketsCommand({}));
  console.log(buckets, "s3 buckets");

  return NextResponse.json({ buckets, success: true }, { status: 200 });
}
