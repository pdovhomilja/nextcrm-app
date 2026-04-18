import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf, type InvoicePdfData } from "./templates/default-invoice";

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf data={data} />);
}
