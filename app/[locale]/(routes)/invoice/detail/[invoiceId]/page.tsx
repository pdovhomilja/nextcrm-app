import React from "react";
import Container from "../../../components/ui/Container";
import { getInvoice } from "@/actions/invoice/get-invoice";

interface InvoiceDetailProps {
  params: { invoiceId: string };
}

const InvoiceDetailPage = async ({ params }: InvoiceDetailProps) => {
  const { invoiceId } = params;
  const invoiceData = await getInvoice(invoiceId);

  return (
    <Container title={`Invoice ${invoiceId}`} description="Invoice detail page">
      <pre>{JSON.stringify(invoiceData, null, 2)}</pre>
    </Container>
  );
};

export default InvoiceDetailPage;
