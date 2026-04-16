"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import resendHelper from "@/lib/resend";
import { getInvoicePdfStream } from "@/lib/invoices/storage";

interface SendInvoiceEmailInput {
  invoiceId: string;
  to: string;
  subject?: string;
  message?: string;
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  const user = await getUser();

  const invoice = await prismadb.invoices.findUniqueOrThrow({
    where: { id: input.invoiceId },
    select: {
      id: true,
      number: true,
      status: true,
      pdfStorageKey: true,
      account: { select: { name: true } },
    },
  });

  if (!invoice.pdfStorageKey) {
    throw new Error("Invoice PDF not generated yet. Please issue the invoice first.");
  }

  // Fetch PDF from storage
  const pdfBody = await getInvoicePdfStream(invoice.pdfStorageKey);
  if (!pdfBody) {
    throw new Error("Failed to retrieve invoice PDF from storage");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfBody as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const resend = await resendHelper();
  const fromEmail = process.env.EMAIL_FROM ?? `invoices@${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "nextcrm.app"}`;

  const subject =
    input.subject ?? `Invoice ${invoice.number ?? invoice.id} — ${invoice.account.name}`;
  const message =
    input.message ?? "Please find attached your invoice as a PDF.";

  await resend.emails.send({
    from: fromEmail,
    to: input.to,
    subject,
    text: message,
    attachments: [
      {
        filename: `invoice-${invoice.number ?? invoice.id}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  // Update status to SENT only if currently ISSUED
  if (invoice.status === "ISSUED") {
    await prismadb.invoices.update({
      where: { id: invoice.id },
      data: {
        status: "SENT",
        activity: {
          create: {
            actorId: user.id,
            action: "SENT",
            meta: { to: input.to, subject },
          },
        },
      },
    });
  } else {
    // Log activity even if we don't change status
    await prismadb.invoice_Activity.create({
      data: {
        invoiceId: invoice.id,
        actorId: user.id,
        action: "EMAIL_SENT",
        meta: { to: input.to, subject },
      },
    });
  }

  return { success: true };
}
