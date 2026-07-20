import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// CRM Config seed data
import crmOpportunityTypeData from "../initial-data/crm_Opportunities_Type.json";
import crmOpportunitySaleStagesData from "../initial-data/crm_Opportunities_Sales_Stages.json";
import crmIndustryTypeData from "../initial-data/crm_Industry_Type.json";
import contactTypesData from "../initial-data/crm_Contact_Types.json";
import leadSourcesData from "../initial-data/crm_Lead_Sources.json";
import leadStatusesData from "../initial-data/crm_Lead_Statuses.json";
import leadTypesData from "../initial-data/crm_Lead_Types.json";

import { seedCurrencies } from "./currencies";
import { seedInvoices } from "./invoices";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function upsertByName(
  model: any,
  items: { name: string; [key: string]: any }[]
) {
  for (const item of items) {
    await model.upsert({
      where: { name: item.name },
      update: item,
      create: item,
    });
  }
}

async function main() {
  console.log("-------- Seeding DB --------");

  // CRM Opportunity Types (no unique on name — use findFirst + create/update)
  for (const item of crmOpportunityTypeData) {
    const existing = await prisma.crm_Opportunities_Type.findFirst({
      where: { name: item.name },
    });
    if (existing) {
      await prisma.crm_Opportunities_Type.update({
        where: { id: existing.id },
        data: { name: item.name, order: item.order, v: item.v },
      });
    } else {
      await prisma.crm_Opportunities_Type.create({
        data: { name: item.name, order: item.order, v: item.v },
      });
    }
  }
  console.log("Opportunity Types seeded");

  // CRM Opportunity Sales Stages (no unique on name — use findFirst + create/update)
  for (const item of crmOpportunitySaleStagesData) {
    const existing = await prisma.crm_Opportunities_Sales_Stages.findFirst({
      where: { name: item.name },
    });
    if (existing) {
      await prisma.crm_Opportunities_Sales_Stages.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          probability: item.probability,
          order: item.order,
          v: item.v,
        },
      });
    } else {
      await prisma.crm_Opportunities_Sales_Stages.create({
        data: {
          name: item.name,
          probability: item.probability,
          order: item.order,
          v: item.v,
        },
      });
    }
  }
  console.log("Opportunity Sales Stages seeded");

  // Connect automation kinds to the runbook stages (idempotent; matches by
  // name, skips stages an admin renamed — kinds are then set in admin UI).
  // The base seed's `crm_Opportunities_Sales_Stages.json` uses this repo's
  // legacy stage names rather than the AQUNAMA runbook names, so the mapping
  // below only covers names whose automation intent is unambiguous; the
  // rest stay unmapped and are set via Admin -> Funnel settings.
  const stageKindByName: Record<string, string> = {
    "Pre-Sale": "pre_sale",
    "Qualified Lead": "qualified",
    "Purchase Order": "purchase_order",
    "Delivery": "delivery",
    "Care": "care",
    // Legacy demo-data stage names (see crm_Opportunities_Sales_Stages.json)
    "New": "pre_sale",
    "Need analysis": "qualified",
    "Signing": "purchase_order",
    "Realization of the project": "delivery",
  };
  for (const [name, kind] of Object.entries(stageKindByName)) {
    await prisma.crm_Opportunities_Sales_Stages.updateMany({
      where: { name, stage_kind: null },
      data: { stage_kind: kind },
    });
  }
  console.log("Sales stage kinds connected");

  // CRM Industry Types (no unique on name — use findFirst + create/update)
  for (const item of crmIndustryTypeData) {
    const existing = await prisma.crm_Industry_Type.findFirst({
      where: { name: item.name },
    });
    if (existing) {
      await prisma.crm_Industry_Type.update({
        where: { id: existing.id },
        data: { name: item.name, v: item.v },
      });
    } else {
      await prisma.crm_Industry_Type.create({
        data: { name: item.name, v: item.v },
      });
    }
  }
  console.log("Industry Types seeded");

  // CRM Contact Types (has @unique on name — can use upsert)
  await upsertByName(prisma.crm_Contact_Types, contactTypesData);
  console.log("Contact Types seeded");

  // CRM Lead Sources (has @unique on name — can use upsert)
  await upsertByName(prisma.crm_Lead_Sources, leadSourcesData);
  console.log("Lead Sources seeded");

  // CRM Lead Statuses (has @unique on name — can use upsert)
  await upsertByName(prisma.crm_Lead_Statuses, leadStatusesData);
  console.log("Lead Statuses seeded");

  // CRM Lead Types (has @unique on name — can use upsert)
  await upsertByName(prisma.crm_Lead_Types, leadTypesData);
  console.log("Lead Types seeded");

  // Test User for E2E Testing
  const testUserEmail = process.env.TEST_USER_EMAIL || "test@nextcrm.app";
  // Name must contain "a" — e2e helpers (selectUserInCombobox) type "a" to
  // filter the assignee combobox and need this user to match.
  const testUser = await prisma.users.upsert({
    where: { email: testUserEmail },
    update: {
      name: "Playwright Admin",
      userStatus: "ACTIVE",
      role: "admin",
    },
    create: {
      email: testUserEmail,
      name: "Playwright Admin",
      userStatus: "ACTIVE",
      role: "admin",
    },
  });
  console.log(`Test user seeded: ${testUserEmail}`);

  // Demo CRM dataset for e2e tests — the update/detail specs act on the
  // first table row and need at least one record per entity. Idempotent:
  // created only when missing (matched by name/email). Gated so a manual
  // `prisma db seed` against a real database doesn't inject demo records:
  // runs in CI (GitHub Actions sets CI=true) or with SEED_DEMO_DATA=1.
  const seedDemoData =
    process.env.CI === "true" || process.env.SEED_DEMO_DATA === "1";
  if (!seedDemoData) {
    console.log("Demo CRM dataset skipped (set SEED_DEMO_DATA=1 to include)");
  } else {
  let demoAccount = await prisma.crm_Accounts.findFirst({
    where: { name: "Seed Demo Account" },
  });
  if (!demoAccount) {
    demoAccount = await prisma.crm_Accounts.create({
      data: {
        v: 0,
        name: "Seed Demo Account",
        status: "Active",
        email: "demo-account@nextcrm.app",
        assigned_to: testUser.id,
      },
    });
  }

  let demoContact = await prisma.crm_Contacts.findFirst({
    where: { last_name: "Demo Contact" },
  });
  if (!demoContact) {
    demoContact = await prisma.crm_Contacts.create({
      data: {
        first_name: "Seed",
        last_name: "Demo Contact",
        // Overridable so local calendar testing can direct invites to a real
        // inbox. Only takes effect on a database where this contact does not
        // yet exist (it is created, never updated) — i.e. after `pnpm db:reset`,
        // not on a re-run of `db:seed` against an existing row.
        email: process.env.SEED_CONTACT_EMAIL || "demo-contact@nextcrm.app",
        accountsIDs: demoAccount.id,
        assigned_to: testUser.id,
      },
    });
  }

  const demoLead = await prisma.crm_Leads.findFirst({
    where: { lastName: "Demo Lead" },
  });
  if (!demoLead) {
    await prisma.crm_Leads.create({
      data: {
        firstName: "Seed",
        lastName: "Demo Lead",
        company: "Seed Demo Company",
        email: "demo-lead@nextcrm.app",
        assigned_to: testUser.id,
      },
    });
  }

  const demoOpportunity = await prisma.crm_Opportunities.findFirst({
    where: { name: "Seed Demo Opportunity" },
  });
  if (!demoOpportunity) {
    const firstStage = await prisma.crm_Opportunities_Sales_Stages.findFirst({
      orderBy: { order: "asc" },
    });
    const firstType = await prisma.crm_Opportunities_Type.findFirst({
      orderBy: { order: "asc" },
    });
    await prisma.crm_Opportunities.create({
      data: {
        name: "Seed Demo Opportunity",
        account: demoAccount.id,
        contact: demoContact.id,
        sales_stage: firstStage?.id,
        type: firstType?.id,
        budget: 10000,
        expected_revenue: 8000,
        close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assigned_to: testUser.id,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      },
    });
  }

  const demoTarget = await prisma.crm_Targets.findFirst({
    where: { email: "demo-target@nextcrm.app" },
  });
  if (!demoTarget) {
    await prisma.crm_Targets.createMany({
      data: [
        {
          last_name: "Demo Target One",
          company: "Target Co One",
          email: "demo-target@nextcrm.app",
          created_by: testUser.id,
        },
        {
          last_name: "Demo Target Two",
          company: "Target Co Two",
          email: "demo-target-2@nextcrm.app",
          created_by: testUser.id,
        },
        {
          last_name: "Demo Target Three",
          company: "Target Co Three",
          email: "demo-target-3@nextcrm.app",
          created_by: testUser.id,
        },
      ],
    });
  }
  console.log("Demo CRM dataset seeded");
  }

  // Currencies and Exchange Rates
  await seedCurrencies(prisma);

  // Invoice module defaults
  await seedInvoices(prisma);

  console.log("-------- Seed DB completed --------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
