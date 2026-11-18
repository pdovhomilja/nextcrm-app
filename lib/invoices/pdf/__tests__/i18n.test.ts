import { getPdfStrings } from "../i18n";

it("returns Brazilian Portuguese labels for invoice PDFs", () => {
  expect(getPdfStrings("pt-BR")).toMatchObject({
    invoice: "Fatura",
    issueDate: "Data de emissão",
    grandTotal: "Total geral",
    page: "Página",
  });
});
