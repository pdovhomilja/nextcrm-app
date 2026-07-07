import { test } from "@playwright/test";
import { createLead } from "../../flows/leads";
import { unique } from "../../helpers/random";
import { LeadDetailPage, LeadListPage } from "../../pages/leads";

test.describe("E2E-FULL-012: Lead con verificación de detalle", () => {
  test("crear lead y verificar en listado y detalle", async ({ page }) => {
    test.setTimeout(60_000);

    const leadData = await createLead(page, {
      last_name: unique("Lead Detail"),
      email: "detail@leadtest.com",
      company: unique("DetailCorp"),
    });

    await LeadListPage.from(page).open();
    const leadList = await LeadListPage.create(page);
    await leadList.expectVisible(leadData.last_name);

    await leadList.clickRow(leadData.last_name);
    const leadDetail = await LeadDetailPage.create(page);
    await leadDetail.expectName(leadData.last_name);
  });
});
