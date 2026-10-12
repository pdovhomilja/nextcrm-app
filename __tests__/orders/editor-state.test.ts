import { actionsOutsideEditor, editorTotals, toLineInputs, type EditorLine } from "@/app/[locale]/(routes)/crm/orders/components/editor-state";

const row = (over: Partial<EditorLine> = {}): EditorLine => ({ key: "k", productId: "p1", productName: "Tea", quantity: "2", listPrice: "49.00", unitPrice: "", vatRate: "12.00", ...over });

it("sends unitPrice only for typed prices", () => {
  expect(toLineInputs([row(), row({ unitPrice: "45" })])).toEqual([
    { productId: "p1", quantity: "2", unitPrice: null },
    { productId: "p1", quantity: "2", unitPrice: "45" },
  ]);
  expect(toLineInputs([row({ productId: "" })])).toEqual([]);
});

it("totals the editor rows like the server", () => {
  const t = editorTotals([row(), row({ unitPrice: "45" })]);
  expect([t.subtotal, t.vatTotal, t.grandTotal, t.belowList]).toEqual(["188.00", "22.56", "210.56", true]);
});

it("keeps Submit inside an open editor so unsaved edits are saved first (review I7)", () => {
  expect(actionsOutsideEditor(["edit", "delete", "submit"], true)).toEqual(["edit", "delete"]);
  expect(actionsOutsideEditor(["approve", "reject"], false)).toEqual(["approve", "reject"]);
});
