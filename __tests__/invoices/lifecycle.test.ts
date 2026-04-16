/**
 * Integration tests for invoice lifecycle (server actions).
 *
 * These tests mock auth and external services (FX, PDF, storage) so the
 * actions can be exercised against a real (or test) database via Prisma.
 *
 * If the database is unreachable or the Prisma adapter-pg setup doesn't
 * work in the Jest context, the tests will fail at setup — see the report.
 */

/* ------------------------------------------------------------------
 * Mocks — must be declared before any import that triggers them
 * ------------------------------------------------------------------ */

/**
 * We need a real user ID (UUID) because the invoices table has a foreign-key
 * or UUID-typed `createdBy` column. We'll look up or create a user in
 * beforeAll and patch the mock, but for the initial mock declaration we
 * use a placeholder that will be overwritten.
 */
const TEST_USER_ID_PLACEHOLDER = "00000000-0000-4000-a000-000000000001";

const mockGetUser = jest.fn().mockResolvedValue({
  id: TEST_USER_ID_PLACEHOLDER,
  is_admin: true,
  name: "Test User",
  email: "test@example.com",
  userLanguage: "en",
});

jest.mock("@/actions/get-user", () => ({
  getUser: (...args: unknown[]) => mockGetUser(...args),
}));

jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({
    user: {
      id: TEST_USER_ID_PLACEHOLDER,
      name: "Test User",
      email: "test@example.com",
    },
  }),
}));

jest.mock("@/lib/invoices/fx", () => ({
  fetchFxRate: jest.fn().mockResolvedValue(
    // Return a Decimal-like object; the action calls `.toString()` on it
    { toString: () => "1", toNumber: () => 1 }
  ),
}));

jest.mock("@/lib/invoices/pdf/render", () => ({
  renderInvoicePdf: jest.fn().mockResolvedValue(Buffer.from("fake-pdf")),
}));

jest.mock("@/lib/invoices/storage", () => ({
  uploadInvoicePdf: jest.fn().mockResolvedValue("invoices/test/fake.pdf"),
}));

/* ------------------------------------------------------------------
 * Imports
 * ------------------------------------------------------------------ */

import { createInvoice } from "@/actions/invoices/create-invoice";
import { updateInvoice } from "@/actions/invoices/update-invoice";
import { issueInvoice } from "@/actions/invoices/issue-invoice";
import { cancelInvoice } from "@/actions/invoices/cancel-invoice";
import { duplicateInvoice } from "@/actions/invoices/duplicate-invoice";
import { addPayment } from "@/actions/invoices/add-payment";
import { prismadb } from "@/lib/prisma";

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */

/** IDs populated in beforeAll */
let testAccountId: string;
let testTaxRateId: string | undefined;
let testSeriesId: string | undefined;

/** Track invoices created so we can clean up */
const createdInvoiceIds: string[] = [];

/** Shorthand to build a minimal create-invoice payload */
function draftPayload(
  overrides: Record<string, unknown> = {},
  lineOverrides: Record<string, unknown> = {}
) {
  return {
    accountId: testAccountId,
    currency: "USD",
    type: "INVOICE",
    lineItems: [
      {
        position: 0,
        description: "Test item",
        quantity: 1,
        unitPrice: 100,
        discountPercent: 0,
        ...(testTaxRateId ? { taxRateId: testTaxRateId } : {}),
        ...lineOverrides,
      },
    ],
    ...overrides,
  };
}

/* ------------------------------------------------------------------
 * Setup / Teardown
 * ------------------------------------------------------------------ */

beforeAll(async () => {
  // Try to find a real user for the mock (avoids potential FK issues)
  const existingUser = await prismadb.users.findFirst();
  if (existingUser) {
    mockGetUser.mockResolvedValue({
      id: existingUser.id,
      is_admin: true,
      name: existingUser.name ?? "Test User",
      email: existingUser.email ?? "test@example.com",
      userLanguage: "en",
    });
  }

  // Ensure a test account exists
  let account = await prismadb.crm_Accounts.findFirst();
  if (!account) {
    account = await prismadb.crm_Accounts.create({
      data: { v: 0, name: "Lifecycle Test Account", status: "Active" },
    });
  }
  testAccountId = account.id;

  // Find an active tax rate (may not exist in test DB)
  const taxRate = await prismadb.invoice_TaxRates.findFirst({
    where: { active: true },
  });
  testTaxRateId = taxRate?.id;

  // Find or create a series + settings (required for issuing)
  let series = await prismadb.invoice_Series.findFirst();
  if (!series) {
    series = await prismadb.invoice_Series.create({
      data: {
        name: "Test Series",
        prefixTemplate: "INV-{YYYY}-",
        resetPolicy: "YEARLY",
        counter: 0,
        active: true,
      },
    });
  }
  testSeriesId = series.id;

  let settings = await prismadb.invoice_Settings.findFirst();
  if (!settings) {
    // Find a base currency
    let currency = await prismadb.invoice_Currencies.findFirst({
      where: { active: true },
    });
    if (!currency) {
      currency = await prismadb.invoice_Currencies.create({
        data: { code: "USD", name: "US Dollar", symbol: "$", active: true },
      });
    }
    await prismadb.invoice_Settings.create({
      data: {
        baseCurrency: currency.code,
        defaultSeriesId: series.id,
        defaultDueDays: 14,
      },
    });
  }
});

afterAll(async () => {
  // Clean up test invoices (payments + line items cascade in schema)
  if (createdInvoiceIds.length > 0) {
    // Delete payments first
    await prismadb.invoice_Payments.deleteMany({
      where: { invoiceId: { in: createdInvoiceIds } },
    });
    // Delete activity
    await prismadb.invoice_Activity.deleteMany({
      where: { invoiceId: { in: createdInvoiceIds } },
    });
    // Delete line items
    await prismadb.invoice_LineItems.deleteMany({
      where: { invoiceId: { in: createdInvoiceIds } },
    });
    // Delete invoices
    await prismadb.invoices.deleteMany({
      where: { id: { in: createdInvoiceIds } },
    });
  }
  await prismadb.$disconnect();
});

/* ------------------------------------------------------------------
 * Tests
 * ------------------------------------------------------------------ */

describe("Invoice lifecycle", () => {
  it("creates a draft invoice", async () => {
    const invoice = await createInvoice(draftPayload());
    createdInvoiceIds.push(invoice.id);

    expect(invoice.status).toBe("DRAFT");
    expect(invoice.number).toBeNull();
    expect(Number(invoice.grandTotal)).toBeGreaterThan(0);
  });

  it("issues a draft and assigns a number", async () => {
    const draft = await createInvoice(
      draftPayload({}, { quantity: 2, unitPrice: 100 })
    );
    createdInvoiceIds.push(draft.id);

    const issued = await issueInvoice({ invoiceId: draft.id });
    expect(issued.status).toBe("ISSUED");
    expect(issued.number).toBeTruthy();
    expect(typeof issued.number).toBe("string");

    // Verify billing snapshot and FX rate were captured
    const fresh = await prismadb.invoices.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(fresh.billingSnapshot).toBeTruthy();
    expect(fresh.fxRateToBase).toBeTruthy();
  });

  it("adds payments and transitions through PARTIALLY_PAID to PAID", async () => {
    const draft = await createInvoice(
      draftPayload({}, { quantity: 1, unitPrice: 100 })
    );
    createdInvoiceIds.push(draft.id);

    await issueInvoice({ invoiceId: draft.id });

    // Partial payment
    await addPayment({
      invoiceId: draft.id,
      amount: 50,
      paidAt: new Date(),
      method: "Bank",
    });
    let inv = await prismadb.invoices.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(inv.status).toBe("PARTIALLY_PAID");

    // Remaining payment
    const remaining = Number(inv.balanceDue);
    expect(remaining).toBeGreaterThan(0);

    await addPayment({
      invoiceId: draft.id,
      amount: remaining,
      paidAt: new Date(),
      method: "Bank",
    });
    inv = await prismadb.invoices.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(inv.status).toBe("PAID");
  });

  it("cancels a draft invoice", async () => {
    const draft = await createInvoice(draftPayload());
    createdInvoiceIds.push(draft.id);

    await cancelInvoice(draft.id);

    const inv = await prismadb.invoices.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(inv.status).toBe("CANCELLED");
  });

  it("duplicates an invoice as a new draft", async () => {
    const draft = await createInvoice(
      draftPayload({}, { description: "Clone me", unitPrice: 75 })
    );
    createdInvoiceIds.push(draft.id);

    const dup = await duplicateInvoice(draft.id);
    createdInvoiceIds.push(dup.id);

    expect(dup.status).toBe("DRAFT");
    expect(dup.id).not.toBe(draft.id);
    expect(dup.originalInvoiceId).toBe(draft.id);
  });

  it("prevents editing an issued invoice", async () => {
    const draft = await createInvoice(draftPayload());
    createdInvoiceIds.push(draft.id);

    await issueInvoice({ invoiceId: draft.id });

    await expect(
      updateInvoice(draft.id, { publicNotes: "Should fail" })
    ).rejects.toThrow();
  });
});
