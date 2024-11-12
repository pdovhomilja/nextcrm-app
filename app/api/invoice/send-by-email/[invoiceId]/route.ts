import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import sendEmail from "@/lib/sendmail";
import { fillXmlTemplate } from "@/lib/xml-generator";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ invoiceId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ status: 401, body: { error: "Unauthorized" } });
  }

  const { invoiceId } = params;

  if (!invoiceId) {
    return NextResponse.json({
      status: 400,
      body: { error: "Bad Request - invoice id is mandatory" },
    });
  }

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

  if (!buffer) {
    return NextResponse.json({
      status: 400,
      body: { error: "Bad Request - buffer is empty. Nothing to send." },
    });
  }

  let message = `Hello, \n\n Please find attached invoice in XML format. \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;

  //Get accountant email from database (MyAccount table)
  const accountantEmail = await prismadb.myAccount.findFirst({});

  if (!accountantEmail) {
    return NextResponse.json({
      status: 400,
      body: {
        error:
          "Bad Request - accountant email is empty. Nothing to send. Fill the accountant email in the settings.",
      },
    });
  }

  if (accountantEmail.email_accountant) {
    await sendEmail({
      from: process.env.EMAIL_FROM,
      to: accountantEmail.email_accountant,
      subject: `${process.env.NEXT_PUBLIC_APP_NAME} invoice in XML format for ERP system`,
      text: message,
      //@ts-ignore
      attachments: [
        {
          filename: `invoice-${invoiceId}.xml`,
          content: buffer,
          contentType: "application/xml",
        },
      ],
    });
    return NextResponse.json({
      status: 200,
      body: { message: "Email with XML send to its destination" },
    });
  }
  return NextResponse.json(
    {
      message:
        "There is no accountant email in the database. Nothing to send. Fill the accountant email in the settings.",
    },
    { status: 400 }
  );
}
