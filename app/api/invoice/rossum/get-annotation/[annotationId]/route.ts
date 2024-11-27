/*
This route will get annotation from Rossum API and store it in S3 bucket as JSON and XML file and make it available for download
Next step is to update invoice metadata from annotation in database (invoice table)
TODO: think about how to handle annotation files security - now they are public
*/
import { authOptions } from "@/lib/auth";
import { s3Client } from "@/lib/digital-ocean-s3";
import { getRossumToken } from "@/lib/get-rossum-token";
import { prismadb } from "@/lib/prisma";
import { PutObjectAclCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ annotationId: string }> }) {
  const params = await props.params;
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

  //console.log(annotationId, "annotationId");

  const data = await fetch(
    `${process.env.ROSSUM_API_URL}/queues/${queueId}/export/?format=json&id=${annotationId}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  )
    .then((r) => r.json())
    .then((data) => {
      //console.log(data);
      return data;
    });

  //console.log(data.results[0].status, "data from get annotation route");

  if (data.results[0].status === "importing") {
    return NextResponse.json(
      { error: "Data from rossum API not ready yet!" },
      {
        status: 400,
      }
    );
  }

  //Variables for invoice definition
  const basicInfoSectionData = {
    document_id: "",
    order_id: "",
    date_issue: new Date(),
    date_due: new Date(),
    document_type: "",
    language: "",
  };
  const paymentInfoSectionData = {
    vendor_bank: "",
    account_num: "",
    bank_num: "",
    iban: "",
    bic: "",
    var_sym: "",
    spec_sym: "",
  };
  const amountSectionData = {
    amount_total: "",
    amount_total_base: "",
    amount_total_tax: "",
    currency: "",
  };
  const vendorSectionData = {
    sender_name: "",
    vendor_street: "",
    vendor_city: "",
    vendor_zip: "",
    sender_ic: "",
    sender_vat_id: "",
    sender_email: "",
    recipient_ic: "",
  };

  if (data.results && data.results.length > 0) {
    //Section for invoice definition
    const basicInfoSection = data.results[0].content.find(
      (section: any) => section.schema_id === "basic_info_section"
    );

    const amountsSection = data.results[0].content.find(
      (section: any) => section.schema_id === "amounts_section"
    );

    const paymentInfoSection = data.results[0].content.find(
      (section: any) => section.schema_id === "payment_info_section"
    );

    const vendorSection = data.results[0].content.find(
      (section: any) => section.schema_id === "vendor_section"
    );

    //Data from basic info section
    const documentIdDataPoint = basicInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "document_id"
    );
    if (documentIdDataPoint) {
      basicInfoSectionData.document_id = documentIdDataPoint.value;
      console.log("Document ID:", basicInfoSectionData.document_id);
    }

    const orderIdDataPoint = basicInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "order_id"
    );
    if (orderIdDataPoint) {
      basicInfoSectionData.order_id = orderIdDataPoint.value;
      console.log("Order ID:", basicInfoSectionData.order_id);
    }

    const documentTypeDataPoint = basicInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "document_type"
    );
    if (documentTypeDataPoint) {
      basicInfoSectionData.document_type = documentTypeDataPoint.value;
      console.log("Document Type:", basicInfoSection.document_type);
    }

    const dateIssueDataPoint = basicInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "date_issue"
    );
    if (dateIssueDataPoint) {
      basicInfoSectionData.date_issue = dateIssueDataPoint.value;
      console.log("Issue Date:", basicInfoSectionData.date_issue);
    }
    if (dateIssueDataPoint) {
      const DateValue = dateIssueDataPoint.value;
      const dateComponents = DateValue.split("-").map(Number);
      if (dateComponents.length === 3 && !dateComponents.some(isNaN)) {
        const [year, month, day] = dateComponents;
        const formattedDate = new Date(year, month - 1, day); // Note: Month is 0-based in JavaScript Date

        basicInfoSectionData.date_issue = formattedDate;
        if (!isNaN(formattedDate.getTime())) {
          console.log(formattedDate);
        } else {
          console.error("Invalid date components");
        }
      } else {
        console.error("Invalid date format");
      }
    }

    const dueDateDataPoint = basicInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "date_due"
    );
    if (dueDateDataPoint) {
      basicInfoSectionData.date_due = dueDateDataPoint.value;
      console.log("Due Date:", basicInfoSectionData.date_due);
    }
    if (dueDateDataPoint) {
      const DateValue = dueDateDataPoint.value;
      const dateComponents = DateValue.split("-").map(Number);
      if (dateComponents.length === 3 && !dateComponents.some(isNaN)) {
        const [year, month, day] = dateComponents;
        const formattedDate = new Date(year, month - 1, day); // Note: Month is 0-based in JavaScript Date

        basicInfoSectionData.date_due = formattedDate;
        if (!isNaN(formattedDate.getTime())) {
          console.log(formattedDate);
        } else {
          console.error("Invalid date components");
        }
      } else {
        console.error("Invalid date format");
      }
    }

    const languageDataPoint = basicInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "language"
    );
    if (languageDataPoint) {
      basicInfoSectionData.language = languageDataPoint.value;
      console.log("Language:", basicInfoSectionData.language);
    }

    //Data from amounts section
    const amountTotalDataPoint = amountsSection.children.find(
      (datapoint: any) => datapoint.schema_id === "amount_total"
    );
    if (amountTotalDataPoint) {
      amountSectionData.amount_total = amountTotalDataPoint.value;
      console.log("Invoice Amount:", amountSectionData.amount_total);
    }

    const amountCurrencyDataPoint = amountsSection.children.find(
      (datapoint: any) => datapoint.schema_id === "currency"
    );
    if (amountCurrencyDataPoint) {
      amountSectionData.currency = amountCurrencyDataPoint.value;
      console.log("Invoice Currency:", amountSectionData.currency);
    }
    /*
    Data from payment info section
    */

    //Data from account number
    const bankNameDataPoint = paymentInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "vendor_bank"
    );
    if (bankNameDataPoint) {
      paymentInfoSectionData.vendor_bank = bankNameDataPoint.value;
      console.log("Vendor Bank:", paymentInfoSectionData.vendor_bank);
    }

    const accountNumberDataPoint = paymentInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "account_num"
    );
    if (accountNumberDataPoint) {
      paymentInfoSectionData.account_num = accountNumberDataPoint.value;
      console.log("Account Number:", paymentInfoSectionData.account_num);
    }
    const bankNumberDataPoint = paymentInfoSection.children.find(
      (datapoint: any) => datapoint.schema_id === "bank_num"
    );
    if (bankNumberDataPoint) {
      paymentInfoSectionData.bank_num = bankNumberDataPoint.value;
      console.log("Bank Number:", paymentInfoSectionData.bank_num);
    }

    /*
    End of data from payment info section
    */

    //Data from vendor section
    const vendorNameDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "sender_name"
    );
    if (vendorNameDataPoint) {
      vendorSectionData.sender_name = vendorNameDataPoint.value;
      console.log("Vendor Name:", vendorSectionData.sender_name);
    }

    const vendorVATDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "sender_ic"
    );
    if (vendorVATDataPoint) {
      vendorSectionData.sender_ic = vendorVATDataPoint.value;
      console.log("Vendor VAT ID:", vendorSectionData.sender_ic);
    }

    const vendorTaxDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "sender_vat_id"
    );
    if (vendorTaxDataPoint) {
      vendorSectionData.sender_vat_id = vendorTaxDataPoint.value;
      console.log("Vendor Tax ID:", vendorSectionData.sender_vat_id);
    }

    const vendorEmailDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "sender_email"
    );
    if (vendorEmailDataPoint) {
      vendorSectionData.sender_email = vendorEmailDataPoint.value;
      console.log("Vendor Email:", vendorSectionData.sender_email);
    }

    //TODO: Add recipient IC to vendor section and check if it is a recipient invoice or reject

    const vendorAddressStreetDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "vendor_street"
    );
    if (vendorAddressStreetDataPoint) {
      vendorSectionData.vendor_street = vendorAddressStreetDataPoint.value;
      console.log("Vendor Address Street:", vendorSectionData.vendor_street);
    }

    const vendorAddressCityDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "vendor_city"
    );
    if (vendorAddressCityDataPoint) {
      vendorSectionData.vendor_city = vendorAddressCityDataPoint.value;
      console.log("Vendor Address City:", vendorSectionData.vendor_city);
    }

    const vendorAddressZipDataPoint = vendorSection.children.find(
      (datapoint: any) => datapoint.schema_id === "vendor_zip"
    );
    if (vendorAddressZipDataPoint) {
      vendorSectionData.vendor_zip = vendorAddressZipDataPoint.value;
      console.log("Vendor Address Zip:", vendorSectionData.vendor_zip);
    }
  } else {
    console.log("No results found in the JSON data.");
  }

  //Write data as a buffer for import to S3 bucket
  const buffer = Buffer.from(JSON.stringify(data));
  //const bufferXML = Buffer.from(JSON.stringify(dataXML));

  const fileNameJSON = `rossum/invoice_annotation-${annotationId}.json`;
  const fileNameXML = `rossum/invoice_annotation-${annotationId}.xml`;

  const bucketParamsJSON = {
    Bucket: process.env.DO_BUCKET,
    Key: fileNameJSON,
    Body: buffer,
    ContentType: "application/json",
    ContentDisposition: "inline",
    ACL: "public-read" as const,
  };

  await s3Client.send(new PutObjectCommand(bucketParamsJSON));

  //S3 bucket url for the invoice
  const urlJSON = `https://${process.env.DO_BUCKET}.${process.env.DO_REGION}.digitaloceanspaces.com/${fileNameJSON}`;

  console.log(urlJSON, "url JSON");

  const invoice = await prismadb.invoices.findFirst({
    where: {
      rossum_annotation_id: annotationId,
    },
  });

  if (!invoice) {
    return NextResponse.json("No invoice found", { status: 400 });
  }

  console.log(basicInfoSectionData, "basicInfoSectionData");
  console.log(amountSectionData, "amountSectionData");
  console.log(vendorSectionData, "vendorSectionData");
  console.log(paymentInfoSectionData, "paymentInfoSectionData");

  await prismadb.invoices.update({
    where: {
      id: invoice.id,
    },
    data: {
      variable_symbol: basicInfoSectionData.document_id,
      date_of_case: basicInfoSectionData.date_issue,
      date_due: basicInfoSectionData.date_due,
      document_type: basicInfoSectionData.document_type,
      order_number: basicInfoSectionData.order_id,
      invoice_number: basicInfoSectionData.document_id,
      invoice_amount: amountSectionData.amount_total,
      invoice_currency: amountSectionData.currency,
      invoice_language: basicInfoSectionData.language,
      partner: vendorSectionData.sender_name,
      partner_business_street: vendorSectionData.vendor_street,
      partner_business_city: vendorSectionData.vendor_city,
      partner_business_zip: vendorSectionData.vendor_zip,
      partner_VAT_number: vendorSectionData.sender_ic,
      partner_TAX_number: vendorSectionData.sender_vat_id,
      partner_bank: paymentInfoSectionData.vendor_bank,
      partner_account_number: paymentInfoSectionData.account_num,
      partner_account_bank_number: paymentInfoSectionData.bank_num,
      partner_email: vendorSectionData.sender_email,
      rossum_status: data.results[0].status,
      rossum_annotation_json_url: urlJSON,
      //rossum_annotation_xml_url: urlXML,
    },
  });

  return NextResponse.json({ message: "Hello, world!", data }, { status: 200 });
}
