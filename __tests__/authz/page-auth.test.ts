/**
 * Pages that read data check the caller themselves instead of relying on the
 * layout (layouts and pages render in parallel, so a layout redirect does not
 * stop the page's own queries). No DB: Prisma is a recording stub.
 *
 * A request whose session cookie does not resolve to a session reaches the
 * page as getSession() === null.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth-client", () => ({}));
jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

const mockCalls: string[] = [];
let mockRole: string | null = null;
jest.mock("@/lib/prisma", () => {
  const db = new Proxy(
    {},
    {
      get: (_t, model: string) =>
        new Proxy(
          {},
          {
            get: (_m, method: string) => async () => {
              mockCalls.push(`${model}.${method}`);
              if (model === "users" && method === "findUnique") {
                return mockRole ? { id: "u1", role: mockRole } : null;
              }
              if (method === "findMany") return [];
              if (method === "count") return 0;
              return null;
            },
          }
        ),
    }
  );
  return { prismadb: db };
});
jest.mock("@/lib/prisma-base", () => ({
  prismaBase: {
    installedPlugin: {
      findMany: async () => {
        mockCalls.push("installedPlugin.findMany");
        return [];
      },
    },
  },
}));

(global as unknown as { React: unknown }).React = jest.requireActual("react");

import { getSession } from "@/lib/auth-server";
import { AuthenticationError, AuthorizationError } from "@/lib/authz";
import { invalidatePluginCache, listPluginsForAdmin } from "@/lib/plugins/state";
import NewInvoicePage from "@/app/[locale]/(routes)/invoices/new/page";
import EditInvoicePage from "@/app/[locale]/(routes)/invoices/[invoiceId]/edit/page";
import NewCampaignPage from "@/app/[locale]/(routes)/campaigns/new/page";
import InvoiceSettingsPage from "@/app/[locale]/(routes)/admin/invoices/settings/page";
import InvoiceSeriesPage from "@/app/[locale]/(routes)/admin/invoices/series/page";
import TaxRatesPage from "@/app/[locale]/(routes)/admin/invoices/tax-rates/page";
import PluginsPage from "@/app/[locale]/(routes)/admin/plugins/page";
import FunnelSettingsPage from "@/app/[locale]/(routes)/admin/funnel-settings/page";
import CalendarSettingsPage from "@/app/[locale]/(routes)/admin/calendar-settings/page";
import CrmDashboardPage from "@/app/[locale]/(routes)/crm/dashboard/page";
import ProductsPage from "@/app/[locale]/(routes)/crm/products/page";

const session = getSession as jest.Mock;
type Page = () => Promise<unknown>;

const signedInPages: [string, Page][] = [
  ["invoices/new", () => NewInvoicePage()],
  ["invoices/[invoiceId]/edit", () => EditInvoicePage({ params: Promise.resolve({ invoiceId: "inv-1" }) })],
  ["campaigns/new", () => NewCampaignPage()],
  ["crm/dashboard", () => CrmDashboardPage()],
  ["crm/products", () => ProductsPage()],
];
const adminPages: [string, Page][] = [
  ["admin/invoices/settings", () => InvoiceSettingsPage()],
  ["admin/invoices/series", () => InvoiceSeriesPage()],
  ["admin/invoices/tax-rates", () => TaxRatesPage()],
  ["admin/plugins", () => PluginsPage()],
  ["admin/funnel-settings", () => FunnelSettingsPage()],
  ["admin/calendar-settings", () => CalendarSettingsPage()],
];

const signedInAs = (role: string | null) => {
  mockRole = role;
  session.mockResolvedValue(role ? { user: { id: "u1", role } } : null);
};

beforeEach(() => {
  mockCalls.length = 0;
  invalidatePluginCache();
});

describe.each([...signedInPages, ...adminPages])("%s", (_name, page) => {
  it("refuses a request without a valid session before reading any data", async () => {
    signedInAs(null);
    await expect(page()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockCalls).toEqual([]);
  });
});

describe.each(adminPages)("%s", (_name, page) => {
  it("refuses a non-admin user before reading page data", async () => {
    signedInAs("user");
    await expect(page()).rejects.toBeInstanceOf(AuthorizationError);
    expect(mockCalls).toEqual(["users.findUnique"]);
  });

  it("renders for an admin", async () => {
    signedInAs("admin");
    await expect(page()).resolves.toBeDefined();
  });
});

describe("listPluginsForAdmin", () => {
  it("refuses a non-admin user without reading plugin state", async () => {
    signedInAs("user");
    await expect(listPluginsForAdmin()).rejects.toBeInstanceOf(AuthorizationError);
    expect(mockCalls).toEqual(["users.findUnique"]);
  });
});
