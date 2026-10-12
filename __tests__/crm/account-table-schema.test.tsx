jest.mock("@/app/[locale]/(routes)/crm/accounts/table-components/data-table-row-actions", () => ({
  DataTableRowActions: () => null,
}));

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { accountSchema } from "@/app/[locale]/(routes)/crm/accounts/table-data/schema";

// Jest compiles JSX in classic mode, so the component file needs React in scope.
(global as unknown as { React: typeof React }).React = React;
const { columns } = require("@/app/[locale]/(routes)/crm/accounts/table-components/columns");

// Contacts imported from Odoo with a one-word name have first_name = null.
const row = { id: "a1", name: "Puffbox s.r.o.", contacts: [{ first_name: null, last_name: "Marek" }] };

describe("accountSchema", () => {
  it("accepts a contact with a null first_name (the accounts list must not crash)", () => {
    const parsed = accountSchema.parse(row);
    expect(parsed.contacts?.[0].last_name).toBe("Marek");
  });
});

describe("accounts table contact column", () => {
  it("shows only the last name when first_name is null", () => {
    const col = columns.find((c: { accessorKey?: string }) => c.accessorKey === "contacts")!;
    const cell = col.cell as (ctx: unknown) => React.ReactElement;
    const html = renderToStaticMarkup(cell({ row: { original: row } }));
    expect(html).toContain("Marek");
    expect(html).not.toContain("null");
  });
});
