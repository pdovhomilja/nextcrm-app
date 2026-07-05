import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createActivity } from "../../flows/activities";
import { createContact } from "../../flows/contacts";
import { createLead } from "../../flows/leads";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { ActivityFeedPage } from "../../pages/activities";
import { ContactDetailPage, ContactListPage } from "../../pages/contacts";
import { LeadDetailPage, LeadListPage } from "../../pages/leads";

test.describe("E2E-FULL-002: Conversión de Lead (Admin)", () => {
  test("crear lead, simular conversión creando account+contact, y agregar actividad", async ({ page }) => {
    test.setTimeout(60_000);

    const leadData = await createLead(page, {
      last_name: unique("LeadConvert"),
      email: "convert@leadtest.com",
      company: unique("ConvertCorp"),
    });

    await LeadListPage.from(page).open();
    const leadList = await LeadListPage.create(page);
    await leadList.expectVisible(leadData.last_name);

    await leadList.clickRow(leadData.last_name);
    const leadDetail = await LeadDetailPage.create(page);
    await leadDetail.expectName(leadData.last_name);

    const accountData = await createAccount(page, {
      name: leadData.company,
      email: leadData.email,
    });

    const contactData = await createContact(page, {
      last_name: leadData.last_name,
      first_name: leadData.first_name,
      email: leadData.email,
      assigned_account: accountData.name,
    });

    await AccountListPage.from(page).open();
    const accountList = await AccountListPage.create(page);
    await accountList.expectVisible(accountData.name);

    await ContactListPage.from(page).open();
    const contactList = await ContactListPage.create(page);
    await contactList.search(contactData.last_name);
    await contactList.expectVisible(contactData.last_name);

    await contactList.clickRow(contactData.last_name);
    const contactDetail = await ContactDetailPage.create(page);
    await contactDetail.expectLinkedAccount(accountData.name);

    const activityData = await createActivity(page, accountData.name, {
      title: unique("Actividad Post-Convert"),
      type: "call",
      status: "Completed",
    });

    await AccountListPage.from(page).open();
    const accountList2 = await AccountListPage.create(page);
    await accountList2.clickRow(accountData.name);
    await AccountDetailPage.create(page);

    const feed = new ActivityFeedPage(page);
    await feed.expectActivityVisible(activityData.title);
  });
});
