/**
 * Inventory of partner entry points (partner-role spec, ticket 4). Partners
 * are refused by getSession() / requireAuthenticated() unless the call site
 * passes { partner: true }. This test fails when a file opts in (or stops
 * opting in) without being added to (or removed from) this list, so every new
 * door for partners is a deliberate, reviewed change. Opt in only code that
 * reads through the lib/authz scopes or writes through the PARTNER_EDIT asserts.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";

const PARTNER_ENTRY_POINTS = [
  "actions/crm/account/get-task.ts",
  "actions/crm/account/get-tasks.ts",
  "actions/crm/accounts/create-account.ts",
  "actions/crm/accounts/create-task.ts",
  "actions/crm/accounts/get-account-by-id.ts",
  "actions/crm/accounts/get-accounts.ts",
  "actions/crm/accounts/search-accounts.ts",
  "actions/crm/accounts/update-account.ts",
  "actions/crm/activities/create-activity.ts",
  "actions/crm/activities/get-activities-by-entity.ts",
  "actions/crm/activities/update-activity.ts",
  "actions/crm/audit-log/get-audit-log-by-entity.ts",
  "actions/crm/contacts/create-contact.ts",
  "actions/crm/contacts/update-contact.ts",
  "actions/crm/get-account.ts",
  "actions/crm/get-accounts-by-contactId.ts",
  "actions/crm/get-accounts-by-opportunityId.ts",
  "actions/crm/get-accounts.ts",
  "actions/crm/get-contact.ts",
  "actions/crm/get-contacts-by-accountId.ts",
  "actions/crm/get-contacts-by-opportunityId.ts",
  "actions/crm/get-contacts.ts",
  "actions/crm/get-contracts.ts",
  "actions/crm/get-crm-data.ts",
  "actions/crm/get-lead.ts",
  "actions/crm/get-leads-by-accountId.ts",
  "actions/crm/get-leads.ts",
  "actions/crm/get-opportunities-with-includes-by-accountId.ts",
  "actions/crm/get-opportunities-with-includes-by-contactId.ts",
  "actions/crm/get-opportunities-with-includes.ts",
  "actions/crm/get-opportunity.ts",
  "actions/crm/leads/create-lead.ts",
  "actions/crm/leads/update-lead.ts",
  "actions/crm/opportunities/create-opportunity.ts",
  "actions/crm/opportunities/update-opportunity.ts",
  "actions/crm/opportunity/get-expected-revenue.ts",
  "actions/crm/orders/queries.ts",
  "actions/crm/similarity/get-similar-accounts.ts",
  "actions/crm/similarity/get-similar-contacts.ts",
  "actions/crm/similarity/get-similar-leads.ts",
  "actions/crm/similarity/get-similar-opportunities.ts",
  "actions/crm/tasks/add-comment.ts",
  "actions/dashboard/get-accounts-count.ts",
  "actions/dashboard/get-active-users-count.ts",
  "actions/dashboard/get-boards-count.ts",
  "actions/dashboard/get-campaigns-count.ts",
  "actions/dashboard/get-contacts-count.ts",
  "actions/dashboard/get-contracts-count.ts",
  "actions/dashboard/get-documents-count.ts",
  "actions/dashboard/get-invoices-count.ts",
  "actions/dashboard/get-leads-count.ts",
  "actions/dashboard/get-opportunities-count.ts",
  "actions/dashboard/get-targets-count.ts",
  "actions/dashboard/get-tasks-count.ts",
  "actions/documents/get-document-versions.ts",
  "actions/documents/get-documents-by-accountId.ts",
  "actions/documents/get-documents-by-contactId.ts",
  "actions/documents/get-documents-by-opportunityId.ts",
  "actions/documents/get-documents.ts",
  "actions/documents/get-storage-size.ts",
  "actions/documents/search-documents.ts",
  "actions/get-users.ts",
  "actions/invoices/get-invoices-by-accountId.ts",
  "actions/user/get-user-by-id.ts",
  "actions/user/search-users.ts",
  "actions/user/set-language.ts",
  "app/[locale]/(routes)/crm/accounts/[accountId]/components/HistoryTab.tsx",
  "app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx",
  "app/[locale]/(routes)/crm/contacts/[contactId]/components/HistoryTab.tsx",
  "app/[locale]/(routes)/crm/leads/[leadId]/components/HistoryTab.tsx",
  "app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/HistoryTab.tsx",
  "app/[locale]/(routes)/crm/orders/[orderId]/page.tsx",
  "app/[locale]/(routes)/page.tsx",
  "app/api/documents/[documentId]/file/route.ts",
  "app/api/invoices/[invoiceId]/pdf/route.ts",
];

const DEFINITIONS = ["lib/auth-server.ts", "lib/authz/session.ts"];

it("only the listed files open a door for partners", () => {
  const files = execSync("git ls-files -- '*.ts' '*.tsx'", { encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !f.includes("__tests__") && !f.startsWith("tests/") && !DEFINITIONS.includes(f))
    .filter((f) => /\bpartner: true\b/.test(readFileSync(f, "utf8")));
  expect(files.sort()).toEqual([...PARTNER_ENTRY_POINTS].sort());
});
