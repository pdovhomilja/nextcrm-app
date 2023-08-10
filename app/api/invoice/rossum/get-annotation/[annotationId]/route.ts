import { authOptions } from "@/lib/auth";
import { s3Client } from "@/lib/digital-ocean-s3";
import { getRossumToken } from "@/lib/get-rossum-token";
import { prismadb } from "@/lib/prisma";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { annotationId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  const queueId = process.env.ROSSUM_QUEUE_ID;

  if (!queueId) {
    return NextResponse.json("No queueId provided", { status: 400 });
  }

  const { annotationId } = params;

  if (!annotationId) {
    return NextResponse.json("No annotationId provided", { status: 400 });
  }

  const token = await getRossumToken();

  if (!token) {
    return NextResponse.json("No rossum token", { status: 400 });
  }

  const data = await fetch(
    `${process.env.ROSSUM_API_URL}/queues/${queueId}/export/?format=json&id=${annotationId}`,
    {
      method: "POST",
      headers: { Authorization: token },
    }
  )
    .then((r) => r.json())
    .then((data) => {
      //console.log(data);
      return data;
    });

  console.log(data, "data");

  //Variables for invoice definition
  let invoiceId;
  let dueDate;
  let invoice_amount;
  let partner;
  let partner_VAT_number;
  let invoice_currency;

  if (data.results && data.results.length > 0) {
    const documentIdDataPoint = data.results[0].content[0].children.find(
      (datapoint: any) => datapoint.schema_id === "document_id"
    );

    const dueDateDataPoint = data.results[0].content[0].children.find(
      (datapoint: any) => datapoint.schema_id === "date_due"
    );

    //Section for invoice definition
    const amountsSection = data.results[0].content.find(
      (section: any) => section.schema_id === "amounts_section"
    );

    const vendorSection = data.results[0].content.find(
      (section: any) => section.schema_id === "vendor_section"
    );

    //Data from amounts section
    const amountTotalDataPoint = amountsSection.children.find(
      (datapoint: any) => datapoint.schema_id === "amount_total"
    );

    if (amountTotalDataPoint) {
      invoice_amount = amountTotalDataPoint.value;
      console.log("Invoice Amount:", invoice_amount);
    }

    const amountCurrencyDataPoint = amountsSection.children.find(
      (datapoint: any) => datapoint.schema_id === "currency"
    );

    if (amountCurrencyDataPoint) {
      invoice_currency = amountCurrencyDataPoint.value;
      console.log("Invoice Currency:", invoice_currency);
    }
    //Data from vendor section
    const vendorNameDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "sender_name"
    );

    if (vendorNameDataPoint) {
      partner = vendorNameDataPoint.value;
      console.log("Vendor Name:", partner);
    }

    const vendorVATDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "sender_ic"
    );

    if (vendorVATDataPoint) {
      partner_VAT_number = vendorVATDataPoint.value;
      console.log("Vendor VAT:", partner_VAT_number);
    }
    //Data from document id section

    if (documentIdDataPoint) {
      const documentIdValue = documentIdDataPoint.value;
      invoiceId = documentIdValue;
      console.log("Document ID:", documentIdValue);
    } else {
      console.log("Document ID data point not found.");
    }

    if (dueDateDataPoint) {
      const dueDateValue = dueDateDataPoint.value;
      const dateComponents = dueDateValue.split("-").map(Number);
      if (dateComponents.length === 3 && !dateComponents.some(isNaN)) {
        const [year, month, day] = dateComponents;
        const formattedDate = new Date(year, month - 1, day); // Note: Month is 0-based in JavaScript Date

        dueDate = formattedDate;
        if (!isNaN(formattedDate.getTime())) {
          console.log(formattedDate);
        } else {
          console.error("Invalid date components");
        }
      } else {
        console.error("Invalid date format");
      }

      console.log("Due date:", dueDateValue);
    }
  } else {
    console.log("No results found in the JSON data.");
  }

  /*   const dataXML = await fetch(
    `${process.env.ROSSUM_API_URL}/queues/${queueId}/export/?format=xml&id=${annotationId}`,
    {
      method: "POST",
      headers: { Authorization: token },
    }
  )
    .then((r) => r.json())
    .then((data) => {
      //console.log(data);
      return data;
    }); */

  //Write data as a data.json file to /public/tmp folder
  //const fs = require("fs");
  //fs.writeFileSync("./public/tmp/data.json", JSON.stringify(data));

  //console.log(dataXML, "dataXML");

  //Write data as a buffer for import to S3 bucket
  const buffer = Buffer.from(JSON.stringify(data));
  //const bufferXML = Buffer.from(JSON.stringify(dataXML));

  const fileNameJSON = `invoice_annotation-${annotationId}.json`;
  const fileNameXML = `invoice_annotation-${annotationId}.xml`;

  const bucketParamsJSON = {
    Bucket: process.env.DO_BUCKET,
    Key: fileNameJSON,
    Body: buffer,
    ContentType: "application/json",
    ContentDisposition: "inline",
    ACL: "public-read",
  };

  await s3Client.send(new PutObjectCommand(bucketParamsJSON));

  /*   const bucketParamsXML = {
    Bucket: process.env.DO_BUCKET,
    Key: fileNameXML,
    Body: bufferXML,
    ContentType: "application/xml",
    ContentDisposition: "inline",
    ACL: "public-read",
  };

  await s3Client.send(new PutObjectCommand(bucketParamsXML)); */

  //S3 bucket url for the invoice
  const urlJSON = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${fileNameJSON}`;
  //const urlXML = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${fileNameXML}`;

  console.log(urlJSON, "url JSON");
  //console.log(urlXML, "url XML");

  const invoice = await prismadb.invoices.findFirst({
    where: {
      rossum_annotation_id: annotationId,
    },
  });

  if (!invoice) {
    return NextResponse.json("No invoice found", { status: 400 });
  }

  await prismadb.invoices.update({
    where: {
      id: invoice.id,
    },
    data: {
      variable_symbol: invoiceId,
      date_due: dueDate,
      invoice_amount: invoice_amount,
      invoice_currency: invoice_currency,
      partner: partner,
      partner_VAT_number: partner_VAT_number,
      rossum_annotation_json_url: urlJSON,
      //rossum_annotation_xml_url: urlXML,
    },
  });

  return NextResponse.json({ message: "Hello, world!", data }, { status: 200 });
}
