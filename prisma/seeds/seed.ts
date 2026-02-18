import { PrismaClient, gptStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

// Load .env.local for test user credentials
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/*
Seed data is used to populate the database with initial data.
*/
//Menu Items
import moduleData from "../initial-data/system_Modules_Enabled.json";
//GPT Models
import gptModelsDataRaw from "../initial-data/gpt_Models.json";

const gptModelsData = gptModelsDataRaw.map((item) => ({
  ...item,
  status: item.status as gptStatus,
}));
//CRM
import crmOpportunityTypeData from "../initial-data/crm_Opportunities_Type.json";
import crmOpportunitySaleStagesData from "../initial-data/crm_Opportunities_Sales_Stages.json";
import crmCampaignsData from "../initial-data/crm_campaigns.json";
import crmIndustryTypeData from "../initial-data/crm_Industry_Type.json";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Your seeding logic here using Prisma Client
  console.log("-------- Seeding DB --------");

  //Seed Menu Items
  const modules = await prisma.system_Modules_Enabled.findMany();

  if (modules.length === 0) {
    await prisma.system_Modules_Enabled.createMany({
      data: moduleData,
    });
    console.log("Modules seeded successfully");
  } else {
    console.log("Modules already seeded");
  }

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
  const testUserPassword =
    process.env.TEST_USER_PASSWORD || "Som3Co0lP4ssw0rd123!";

  const existingTestUser = await prisma.users.findUnique({
    where: { email: testUserEmail },
  });

  const hashedPassword = await bcrypt.hash(testUserPassword, 10);

  if (!existingTestUser) {
    await prisma.users.create({
      data: {
        email: testUserEmail,
        name: "Test User",
        password: hashedPassword,
        userStatus: "ACTIVE",
        is_admin: true,
        is_account_admin: true,
      },
    });
    console.log(`Test user created: ${testUserEmail}`);
  } else {
    // Update password and status to ensure it matches env vars
    await prisma.users.update({
      where: { email: testUserEmail },
      data: {
        password: hashedPassword,
        userStatus: "ACTIVE",
        is_admin: true,
        is_account_admin: true,
      },
    });
    console.log(`Test user updated: ${testUserEmail}`);
  }

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
