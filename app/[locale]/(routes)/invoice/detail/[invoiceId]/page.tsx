import React from "react";
import Container from "../../../components/ui/Container";
import { getInvoice } from "@/actions/invoice/get-invoice";
import { MessageCircle, MessagesSquare } from "lucide-react";
import InvoiceChat from "../_dialogs/InvoiceChat";

interface InvoiceDetailProps {
  params: Promise<{ invoiceId: string }>;
}

const InvoiceDetailPage = async (props: InvoiceDetailProps) => {
  const params = await props.params;
  const { invoiceId } = params;
  const invoiceData = await getInvoice(invoiceId);

  return (
    <Container title={`Invoice ${invoiceId}`} description="Invoice detail page">
      <div className="flex">
        <div className="w-1/2">
          <embed
            style={{
              width: "100%",
              height: "100%",
            }}
            type="application/pdf"
            src={invoiceData.invoice_file_url}
          />
        </div>
        <div className="py-2">
          <InvoiceChat />
        </div>
        <div className="w-1/2">
          <pre>{JSON.stringify(invoiceData, null, 2)}</pre>
        </div>
      </div>
    </Container>
  );
};

export default InvoiceDetailPage;
