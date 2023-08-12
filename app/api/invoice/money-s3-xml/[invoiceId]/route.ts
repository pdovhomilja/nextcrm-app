import { authOptions } from "@/lib/auth";
import { s3Client } from "@/lib/digital-ocean-s3";
import { prismadb } from "@/lib/prisma";
import { fillXmlTemplate } from "@/lib/xml-generator";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const fs = require("fs");

export async function GET(
  req: Request,
  { params }: { params: { invoiceId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ status: 401, body: { error: "Unauthorized" } });
  }

  //console.log(myCompany, "myCompany");

  const { invoiceId } = params;

  const myCompany = await prismadb.myAccount.findFirst({});

  const invoiceData = await prismadb.invoices.findFirst({
    where: {
      id: invoiceId,
    },
  });

  const xmlString = fillXmlTemplate(invoiceData, myCompany);

  //write xml to file in public folder /public/tmp/[invoiceId].xml
  //fs.writeFileSync(`public/tmp/${invoiceId}.xml`, xmlString);
  //fs.writeFileSync(`public/tmp/${invoiceData}.json`, invoiceData);
  const buffer = Buffer.from(xmlString);

  //Upload xml to S3 bucket and return url
  const bucketParamsJSON = {
    Bucket: process.env.DO_BUCKET,
    Key: `xml/invoice-${invoiceId}.xml`,
    Body: buffer,
    ContentType: "application/json",
    ContentDisposition: "inline",
    ACL: "public-read",
  };

  await s3Client.send(new PutObjectCommand(bucketParamsJSON));

  const urlMoneyS3 = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/xml/invoice-${invoiceId}.xml`;

  //console.log(urlMoneyS3, "url MoneyS3");

  await prismadb.invoices.update({
    where: {
      id: invoiceId,
    },
    data: {
      money_s3_url: urlMoneyS3,
    },
  });

  return NextResponse.json({ xmlString, invoiceData }, { status: 200 });
}
