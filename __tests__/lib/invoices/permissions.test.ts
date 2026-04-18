import {
  canEditInvoice, canIssueInvoice, canCancelInvoice, canAddPayment, isInvoiceImmutable,
} from "@/lib/invoices/permissions";

const u  = { id: "u1", isAdmin: false };
const ad = { id: "admin", isAdmin: true };

describe("isInvoiceImmutable", () => {
  it("DRAFT is mutable", () => expect(isInvoiceImmutable("DRAFT")).toBe(false));
  it.each(["ISSUED","SENT","PAID","PARTIALLY_PAID","CANCELLED"] as const)("%s is immutable", s =>
    expect(isInvoiceImmutable(s)).toBe(true));
});

describe("canEditInvoice", () => {
  it("creator can edit own DRAFT", () =>
    expect(canEditInvoice({ status: "DRAFT", createdBy: "u1" }, u)).toBe(true));
  it("non-creator cannot edit DRAFT", () =>
    expect(canEditInvoice({ status: "DRAFT", createdBy: "u2" }, u)).toBe(false));
  it("admin can edit any DRAFT", () =>
    expect(canEditInvoice({ status: "DRAFT", createdBy: "u2" }, ad)).toBe(true));
  it("nobody can edit ISSUED", () =>
    expect(canEditInvoice({ status: "ISSUED", createdBy: "u1" }, ad)).toBe(false));
});

describe("canIssueInvoice", () => {
  it("creator can issue own DRAFT", () =>
    expect(canIssueInvoice({ status: "DRAFT", createdBy: "u1" }, u)).toBe(true));
  it("cannot issue non-DRAFT", () =>
    expect(canIssueInvoice({ status: "ISSUED", createdBy: "u1" }, u)).toBe(false));
});

describe("canCancelInvoice", () => {
  it("creator can cancel DRAFT", () =>
    expect(canCancelInvoice({ status: "DRAFT", createdBy: "u1" }, u)).toBe(true));
  it("cannot cancel ISSUED", () =>
    expect(canCancelInvoice({ status: "ISSUED", createdBy: "u1" }, ad)).toBe(false));
});

describe("canAddPayment", () => {
  it("admin can add payment to ISSUED", () =>
    expect(canAddPayment({ status: "ISSUED", createdBy: "u2" }, ad)).toBe(true));
  it("cannot add payment to DRAFT", () =>
    expect(canAddPayment({ status: "DRAFT", createdBy: "u1" }, u)).toBe(false));
  it("cannot add payment to CANCELLED", () =>
    expect(canAddPayment({ status: "CANCELLED", createdBy: "u1" }, ad)).toBe(false));
});
