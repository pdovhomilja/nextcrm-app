import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createTargetList } from "../../flows/target-lists";
import { createTarget } from "../../flows/targets";
import { unique } from "../../helpers/random";
import { AccountListPage } from "../../pages/accounts";
import { TargetListListPage } from "../../pages/target-lists";
import { TargetListPage } from "../../pages/targets";

test.describe("E2E-FULL-004: Target List como campaña (Admin)", () => {
  test("crear targets, target list, verificar ambos y simular conversión a account", async ({ page }) => {
    test.setTimeout(60_000);

    const target1 = await createTarget(page, {
      last_name: unique("Target Alpha"),
      company: unique("TargetCorp Alpha"),
    });

    const target2 = await createTarget(page, {
      last_name: unique("Target Beta"),
      company: unique("TargetCorp Beta"),
    });

    const targetListData = await createTargetList(page, {
      name: unique("Campaña E2E"),
    });

    await TargetListPage.from(page).open();
    const targetList = await TargetListPage.create(page);
    await targetList.expectVisible(target1.last_name);
    await targetList.expectVisible(target2.last_name);

    await TargetListListPage.from(page).open();
    const listPage = await TargetListListPage.create(page);
    await listPage.expectVisible(targetListData.name);

    const account1 = await createAccount(page, {
      name: target1.company,
      email: target1.email,
    });

    const account2 = await createAccount(page, {
      name: target2.company,
      email: target2.email,
    });

    await AccountListPage.from(page).open();
    const accountList = await AccountListPage.create(page);
    await accountList.expectVisible(account1.name);
    await accountList.expectVisible(account2.name);
  });
});
