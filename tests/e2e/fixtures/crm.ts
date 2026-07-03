import { test as base } from "@playwright/test";
import type {
  AccountData,
  ContactData,
  ContractData,
  LeadData,
  OpportunityData,
  ProductData,
  TargetData,
} from "../data/factories";
import { createAccount } from "../flows/accounts";
import { loginAsAdmin } from "../flows/auth";
import { createContact } from "../flows/contacts";
import { createContract } from "../flows/contracts";
import { createLead } from "../flows/leads";
import { createOpportunity } from "../flows/opportunities";
import { createProduct } from "../flows/products";
import { createTarget } from "../flows/targets";

interface CrmFixtures {
  account: AccountData;
  contact: ContactData;
  lead: LeadData;
  opportunity: OpportunityData;
  contract: ContractData;
  product: ProductData;
  target: TargetData;
}

export const test = base.extend<CrmFixtures>({
  account: async ({ page }, use: (value: AccountData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createAccount(page);
    await use(data);
  },

  contact: async ({ page }, use: (value: ContactData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createContact(page);
    await use(data);
  },

  lead: async ({ page }, use: (value: LeadData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createLead(page);
    await use(data);
  },

  opportunity: async ({ page }, use: (value: OpportunityData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createOpportunity(page);
    await use(data);
  },

  contract: async ({ page }, use: (value: ContractData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createContract(page);
    await use(data);
  },

  product: async ({ page }, use: (value: ProductData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createProduct(page);
    await use(data);
  },

  target: async ({ page }, use: (value: TargetData) => Promise<void>) => {
    await loginAsAdmin(page);
    const data = await createTarget(page);
    await use(data);
  },
});

export { expect } from "@playwright/test";
