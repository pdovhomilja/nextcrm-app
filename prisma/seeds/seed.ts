import { PrismaClient, gptStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
// Load .env.local for test user credentials
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/*
Seed data is used to populate the database with initial data.
*/
//GPT Models
import gptModelsDataRaw from "../initial-data/gpt_Models.json";
import { seedCurrencies } from "./currencies";

const gptModelsData = gptModelsDataRaw.map((item) => ({
  ...item,
  status: item.status as gptStatus,
}));
//CRM
import crmOpportunityTypeData from "../initial-data/crm_Opportunities_Type.json";
import crmOpportunitySaleStagesData from "../initial-data/crm_Opportunities_Sales_Stages.json";
import crmCampaignsData from "../initial-data/crm_campaigns.json";
import crmIndustryTypeData from "../initial-data/crm_Industry_Type.json";

// New CRM Config Tables
const contactTypesData = [
  { name: "Customer" },
  { name: "Partner" },
  { name: "Vendor" },
  { name: "Prospect" },
];
const leadSourcesData = [
  { name: "Web" },
  { name: "Referral" },
  { name: "Cold Call" },
  { name: "Email Campaign" },
  { name: "Event" },
  { name: "Other" },
];
const leadStatusesData = [
  { name: "New" },
  { name: "Contacted" },
  { name: "Qualified" },
  { name: "Lost" },
];
const leadTypesData = [{ name: "Demo" }];

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Your seeding logic here using Prisma Client
  console.log("-------- Seeding DB --------");

  //Seed CRM Opportunity Types
  const crmOpportunityType = await prisma.crm_Opportunities_Type.findMany();

  if (crmOpportunityType.length === 0) {
    await prisma.crm_Opportunities_Type.createMany({
      data: crmOpportunityTypeData,
    });
    console.log("Opportunity Types seeded successfully");
  } else {
    console.log("Opportunity Types already seeded");
  }

  const crmOpportunitySaleStages =
    await prisma.crm_Opportunities_Sales_Stages.findMany();

  if (crmOpportunitySaleStages.length === 0) {
    await prisma.crm_Opportunities_Sales_Stages.createMany({
      data: crmOpportunitySaleStagesData,
    });
    console.log("Opportunity Sales Stages seeded successfully");
  } else {
    console.log("Opportunity Sales Stages already seeded");
  }

  const crmCampaigns = await prisma.crm_campaigns.findMany();

  if (crmCampaigns.length === 0) {
    await prisma.crm_campaigns.createMany({
      data: crmCampaignsData,
    });
    console.log("Campaigns seeded successfully");
  } else {
    console.log("Campaigns already seeded");
  }

  const crmIndustryType = await prisma.crm_Industry_Type.findMany();

  if (crmIndustryType.length === 0) {
    await prisma.crm_Industry_Type.createMany({
      data: crmIndustryTypeData,
    });
    console.log("Industry Types seeded successfully");
  } else {
    console.log("Industry Types already seeded");
  }

  //Seed GPT Models
  const gptModels = await prisma.gpt_models.findMany();

  if (gptModels.length === 0) {
    await prisma.gpt_models.createMany({
      data: gptModelsData,
    });
    console.log("GPT Models seeded successfully");
  } else {
    console.log("GPT Models already seeded");
  }

  //Seed Test User for E2E Testing
  const testUserEmail = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

  const existingTestUser = await prisma.users.findUnique({
    where: { email: testUserEmail },
  });

  if (!existingTestUser) {
    const user = await prisma.users.create({
      data: {
        email: testUserEmail,
        name: "Test User",
        userStatus: "ACTIVE",
        is_admin: true,
        is_account_admin: true,
        role: "admin",
      },
    });
    console.log(`Test user created: ${testUserEmail}`);
  } else {
    // Update status to ensure it matches expectations
    await prisma.users.update({
      where: { email: testUserEmail },
      data: {
        userStatus: "ACTIVE",
        is_admin: true,
        is_account_admin: true,
        role: "admin",
      },
    });
    console.log(`Test user updated: ${testUserEmail}`);
  }

  const contactTypes = await prisma.crm_Contact_Types.findMany();
  if (contactTypes.length === 0) {
    await prisma.crm_Contact_Types.createMany({ data: contactTypesData });
    console.log("Contact Types seeded successfully");
  } else {
    console.log("Contact Types already seeded");
  }

  const leadSources = await prisma.crm_Lead_Sources.findMany();
  if (leadSources.length === 0) {
    await prisma.crm_Lead_Sources.createMany({ data: leadSourcesData });
    console.log("Lead Sources seeded successfully");
  } else {
    console.log("Lead Sources already seeded");
  }

  const leadStatuses = await prisma.crm_Lead_Statuses.findMany();
  if (leadStatuses.length === 0) {
    await prisma.crm_Lead_Statuses.createMany({ data: leadStatusesData });
    console.log("Lead Statuses seeded successfully");
  } else {
    console.log("Lead Statuses already seeded");
  }

  const leadTypes = await prisma.crm_Lead_Types.findMany();
  if (leadTypes.length === 0) {
    await prisma.crm_Lead_Types.createMany({ data: leadTypesData });
    console.log("Lead Types seeded successfully");
  } else {
    console.log("Lead Types already seeded");
  }

  //Seed Currencies and Exchange Rates
  await seedCurrencies();

  console.log("-------- Seed DB completed --------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
