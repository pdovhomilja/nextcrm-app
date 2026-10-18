import { isPartnerAllowedPath, partnerNavItems } from "../partner-routes";
import getDashboardMenuItem from "@/app/[locale]/(routes)/components/menu-items/Dashboard";
import getCrmMenuItem from "@/app/[locale]/(routes)/components/menu-items/Crm";
import getCampaignsMenuItem from "@/app/[locale]/(routes)/components/menu-items/Campaigns";
import getProjectsMenuItem from "@/app/[locale]/(routes)/components/menu-items/Projects";
import getReportsMenuItem from "@/app/[locale]/(routes)/components/menu-items/Reports";
import getInvoicesMenuItem from "@/app/[locale]/(routes)/components/menu-items/Invoices";
import getAdministrationMenuItem from "@/app/[locale]/(routes)/components/menu-items/Administration";

describe("isPartnerAllowedPath (partner route allow-list, deny by default)", () => {
  it.each([
    "/",
    "/en",
    "/cz/",
    "/en/crm/accounts",
    "/en/crm/accounts/0f6c2b4e-1111-2222-3333-444444444444",
    "/de/crm/contacts/abc",
    "/en/crm/leads",
    "/en/crm/opportunities/abc",
    "/en/crm/tasks/viewtask/abc",
    "/en/crm/orders",
    "/en/sign-in",
    "/api/auth/sign-out",
    "/api/invoices/abc/pdf",
    "/api/documents/abc/file",
  ])("allows %s", (path) => {
    expect(isPartnerAllowedPath(path)).toBe(true);
  });

  it.each([
    "/en/admin",
    "/en/admin/users",
    "/en/campaigns",
    "/en/projects/boards/abc",
    "/en/reports",
    "/en/emails",
    "/en/documents",
    "/en/invoices",
    "/en/invoices/abc",
    "/en/profile",
    "/en/p/oxo-erp-connector",
    "/en/fulltext-search",
    "/en/employees",
    "/en/databox",
    "/en/crm",
    "/en/crm/dashboard",
    "/en/crm/contracts",
    "/en/crm/products",
    "/en/crm/price-lists",
    "/en/crm/approvals",
    "/en/crm/accountsX",
    "/en/crm/accounts-enrichment",
    "/en/some-new-module",
    "/admin",
    "/api/admin/invoices/series",
    "/api/upload/presigned-url",
    "/api/crm/contacts/abc",
    "/api/reports/export",
    "/api/profile/calendar-connections",
    "/api/invoices/abc/pdfX",
    "/api/some-new-route",
  ])("refuses %s", (path) => {
    expect(isPartnerAllowedPath(path)).toBe(false);
  });
});

describe("partnerNavItems (navigation shows only the partner modules)", () => {
  it("keeps the dashboard and his CRM modules, drops everything else", () => {
    const crm = { title: "CRM", accounts: "Accounts", contacts: "Contacts", leads: "Leads",
      opportunities: "Opportunities", contracts: "Contracts", products: "Products",
      priceLists: "Price lists", orders: "Orders" };
    const items = [
      getDashboardMenuItem({ title: "Dashboard" }),
      getCrmMenuItem({ localizations: crm, role: "partner" }),
      getCampaignsMenuItem({ localizations: { title: "Campaigns", campaigns: "c", templates: "t", targets: "t", targetLists: "l" } }),
      getProjectsMenuItem({ title: "Projects" }),
      getReportsMenuItem({ title: "Reports" }),
      getInvoicesMenuItem({ title: "Invoices" }),
      { title: "Plugins", items: [{ title: "OXO ERP", url: "/p/oxo-erp-connector" }] },
      getAdministrationMenuItem({ title: "Administration" }),
    ];
    const visible = partnerNavItems(items).map((i) => [i.title, i.items?.map((s) => s.url)]);
    expect(visible).toEqual([
      ["Dashboard", undefined],
      ["CRM", ["/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities", "/crm/orders"]],
    ]);
  });
});
