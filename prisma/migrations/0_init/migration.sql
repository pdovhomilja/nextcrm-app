-- CreateEnum
CREATE TYPE "crm_Lead_Status" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'LOST');

-- CreateEnum
CREATE TYPE "crm_Lead_Type" AS ENUM ('DEMO');

-- CreateEnum
CREATE TYPE "crm_Opportunity_Status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "crm_Contact_Type" AS ENUM ('Customer', 'Partner', 'Vendor', 'Prospect');

-- CreateEnum
CREATE TYPE "crm_Contracts_Status" AS ENUM ('NOTSTARTED', 'INPROGRESS', 'SIGNED');

-- CreateEnum
CREATE TYPE "DocumentSystemType" AS ENUM ('INVOICE', 'RECEIPT', 'CONTRACT', 'OFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "taskStatus" AS ENUM ('ACTIVE', 'PENDING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('cz', 'en', 'de', 'uk');

-- CreateEnum
CREATE TYPE "gptStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "crm_Accounts" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "annual_revenue" TEXT,
    "assigned_to" UUID,
    "billing_city" TEXT,
    "billing_country" TEXT,
    "billing_postal_code" TEXT,
    "billing_state" TEXT,
    "billing_street" TEXT,
    "company_id" TEXT,
    "description" TEXT,
    "email" TEXT,
    "employees" TEXT,
    "fax" TEXT,
    "industry" UUID,
    "member_of" TEXT,
    "name" TEXT NOT NULL,
    "office_phone" TEXT,
    "shipping_city" TEXT,
    "shipping_country" TEXT,
    "shipping_postal_code" TEXT,
    "shipping_state" TEXT,
    "shipping_street" TEXT,
    "status" TEXT DEFAULT 'Inactive',
    "type" TEXT DEFAULT 'Customer',
    "vat" TEXT,
    "website" TEXT,

    CONSTRAINT "crm_Accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Leads" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "lead_source" TEXT,
    "refered_by" TEXT,
    "campaign" TEXT,
    "status" TEXT DEFAULT 'NEW',
    "type" TEXT DEFAULT 'DEMO',
    "assigned_to" UUID,
    "accountsIDs" UUID,

    CONSTRAINT "crm_Leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Opportunities" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "account" UUID,
    "assigned_to" UUID,
    "budget" INTEGER NOT NULL DEFAULT 0,
    "campaign" UUID,
    "close_date" TIMESTAMP(3),
    "contact" UUID,
    "created_by" UUID,
    "createdBy" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "last_activity_by" UUID,
    "currency" TEXT,
    "description" TEXT,
    "expected_revenue" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "next_step" TEXT,
    "sales_stage" UUID,
    "type" UUID,
    "status" "crm_Opportunity_Status" DEFAULT 'ACTIVE',

    CONSTRAINT "crm_Opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_campaigns" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,

    CONSTRAINT "crm_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Opportunities_Sales_Stages" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "probability" INTEGER,
    "order" INTEGER,

    CONSTRAINT "crm_Opportunities_Sales_Stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Opportunities_Type" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER,

    CONSTRAINT "crm_Opportunities_Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Contacts" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "account" UUID,
    "assigned_to" UUID,
    "birthday" TEXT,
    "created_by" UUID,
    "createdBy" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "cratedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "last_activity_by" UUID,
    "description" TEXT,
    "email" TEXT,
    "personal_email" TEXT,
    "first_name" TEXT,
    "last_name" TEXT NOT NULL,
    "office_phone" TEXT,
    "mobile_phone" TEXT,
    "website" TEXT,
    "position" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "social_twitter" TEXT,
    "social_facebook" TEXT,
    "social_linkedin" TEXT,
    "social_skype" TEXT,
    "social_instagram" TEXT,
    "social_youtube" TEXT,
    "social_tiktok" TEXT,
    "type" TEXT DEFAULT 'Customer',
    "tags" TEXT[],
    "notes" TEXT[],
    "accountsIDs" UUID,

    CONSTRAINT "crm_Contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Contracts" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "renewalReminderDate" TIMESTAMP(3),
    "customerSignedDate" TIMESTAMP(3),
    "companySignedDate" TIMESTAMP(3),
    "description" TEXT,
    "account" UUID,
    "assigned_to" UUID,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "status" "crm_Contracts_Status" NOT NULL DEFAULT 'NOTSTARTED',
    "type" TEXT,

    CONSTRAINT "crm_Contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boards" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "favourite" BOOLEAN,
    "favouritePosition" INTEGER,
    "icon" TEXT,
    "position" INTEGER,
    "title" TEXT NOT NULL,
    "user" UUID NOT NULL,
    "visibility" TEXT,
    "sharedWith" UUID[],
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employees" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "avatar" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "salary" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageUpload" (
    "id" UUID NOT NULL,

    CONSTRAINT "ImageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MyAccount" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "is_person" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "email_accountant" TEXT,
    "phone_prefix" TEXT,
    "phone" TEXT,
    "mobile_prefix" TEXT,
    "mobile" TEXT,
    "fax_prefix" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "country_code" TEXT,
    "billing_street" TEXT,
    "billing_city" TEXT,
    "billing_state" TEXT,
    "billing_zip" TEXT,
    "billing_country" TEXT,
    "billing_country_code" TEXT,
    "currency" TEXT,
    "currency_symbol" TEXT,
    "VAT_number" TEXT NOT NULL,
    "TAX_number" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "bank_code" TEXT,
    "bank_IBAN" TEXT,
    "bank_SWIFT" TEXT,

    CONSTRAINT "MyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoices" (
    "id" UUID NOT NULL,
    "__v" INTEGER,
    "date_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "last_updated_by" UUID,
    "date_received" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "date_of_case" TIMESTAMP(3),
    "date_tax" TIMESTAMP(3),
    "date_due" TIMESTAMP(3),
    "description" TEXT,
    "document_type" TEXT,
    "favorite" BOOLEAN DEFAULT false,
    "variable_symbol" TEXT,
    "constant_symbol" TEXT,
    "specific_symbol" TEXT,
    "order_number" TEXT,
    "internal_number" TEXT,
    "invoice_number" TEXT,
    "invoice_amount" TEXT,
    "invoice_file_mimeType" TEXT NOT NULL,
    "invoice_file_url" TEXT NOT NULL,
    "invoice_items" JSONB,
    "invoice_type" TEXT,
    "invoice_currency" TEXT,
    "invoice_language" TEXT,
    "partner" TEXT,
    "partner_street" TEXT,
    "partner_city" TEXT,
    "partner_zip" TEXT,
    "partner_country" TEXT,
    "partner_country_code" TEXT,
    "partner_business_street" TEXT,
    "partner_business_city" TEXT,
    "partner_business_zip" TEXT,
    "partner_business_country" TEXT,
    "partner_business_country_code" TEXT,
    "partner_VAT_number" TEXT,
    "partner_TAX_number" TEXT,
    "partner_TAX_local_number" TEXT,
    "partner_phone_prefix" TEXT,
    "partner_phone_number" TEXT,
    "partner_fax_prefix" TEXT,
    "partner_fax_number" TEXT,
    "partner_email" TEXT,
    "partner_website" TEXT,
    "partner_is_person" BOOLEAN,
    "partner_bank" TEXT,
    "partner_account_number" TEXT,
    "partner_account_bank_number" TEXT,
    "partner_IBAN" TEXT,
    "partner_SWIFT" TEXT,
    "partner_BIC" TEXT,
    "rossum_status" TEXT,
    "rossum_annotation_id" TEXT,
    "rossum_annotation_url" TEXT,
    "rossum_document_id" TEXT,
    "rossum_document_url" TEXT,
    "rossum_annotation_json_url" TEXT,
    "rossum_annotation_xml_url" TEXT,
    "money_s3_url" TEXT,
    "status" TEXT,
    "invoice_state_id" UUID,
    "assigned_user_id" UUID,
    "assigned_account_id" UUID,
    "visibility" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_States" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "invoice_States_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" UUID NOT NULL,
    "__v" INTEGER,
    "date_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "document_name" TEXT NOT NULL,
    "created_by_user" UUID,
    "createdBy" UUID,
    "description" TEXT,
    "document_type" UUID,
    "favourite" BOOLEAN,
    "document_file_mimeType" TEXT NOT NULL,
    "document_file_url" TEXT NOT NULL,
    "status" TEXT,
    "visibility" TEXT,
    "tags" JSONB,
    "key" TEXT,
    "size" INTEGER,
    "assigned_user" UUID,
    "connected_documents" TEXT[],
    "document_system_type" "DocumentSystemType" DEFAULT 'OTHER',

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents_Types" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Documents_Types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sections" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "board" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER,

    CONSTRAINT "Sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Industry_Type" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "crm_Industry_Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulStatus" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL,

    CONSTRAINT "modulStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tasks" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "dueDateAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "section" UUID,
    "tags" JSONB,
    "title" TEXT NOT NULL,
    "likes" INTEGER DEFAULT 0,
    "user" UUID,
    "taskStatus" "taskStatus" DEFAULT 'ACTIVE',

    CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Accounts_Tasks" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,
    "dueDateAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL,
    "tags" JSONB,
    "title" TEXT NOT NULL,
    "likes" INTEGER DEFAULT 0,
    "user" UUID,
    "taskStatus" "taskStatus" DEFAULT 'ACTIVE',
    "account" UUID,

    CONSTRAINT "crm_Accounts_Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasksComments" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "task" UUID NOT NULL,
    "user" UUID NOT NULL,
    "assigned_crm_account_task" UUID,

    CONSTRAINT "tasksComments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoList" (
    "id" UUID NOT NULL,
    "createdAt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "user" TEXT NOT NULL,

    CONSTRAINT "TodoList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "account_name" TEXT,
    "avatar" TEXT,
    "email" TEXT NOT NULL,
    "is_account_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "name" TEXT,
    "password" TEXT,
    "username" TEXT,
    "userStatus" "ActiveStatus" NOT NULL DEFAULT 'PENDING',
    "userLanguage" "Language" NOT NULL DEFAULT 'en',

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_Modules_Enabled" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "system_Modules_Enabled_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secondBrain_notions" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "user" UUID NOT NULL,
    "notion_api_key" TEXT NOT NULL,
    "notion_db_id" TEXT NOT NULL,

    CONSTRAINT "secondBrain_notions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openAi_keys" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "user" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,

    CONSTRAINT "openAi_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemServices" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "serviceUrl" TEXT,
    "serviceId" TEXT,
    "serviceKey" TEXT,
    "servicePassword" TEXT,
    "servicePort" TEXT,
    "description" TEXT,

    CONSTRAINT "systemServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gpt_models" (
    "id" UUID NOT NULL,
    "__v" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    "status" "gptStatus",
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gpt_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentsToInvoices" (
    "document_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToInvoices_pkey" PRIMARY KEY ("document_id","invoice_id")
);

-- CreateTable
CREATE TABLE "DocumentsToOpportunities" (
    "document_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToOpportunities_pkey" PRIMARY KEY ("document_id","opportunity_id")
);

-- CreateTable
CREATE TABLE "DocumentsToContacts" (
    "document_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToContacts_pkey" PRIMARY KEY ("document_id","contact_id")
);

-- CreateTable
CREATE TABLE "DocumentsToTasks" (
    "document_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToTasks_pkey" PRIMARY KEY ("document_id","task_id")
);

-- CreateTable
CREATE TABLE "DocumentsToCrmAccountsTasks" (
    "document_id" UUID NOT NULL,
    "crm_accounts_task_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToCrmAccountsTasks_pkey" PRIMARY KEY ("document_id","crm_accounts_task_id")
);

-- CreateTable
CREATE TABLE "DocumentsToLeads" (
    "document_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToLeads_pkey" PRIMARY KEY ("document_id","lead_id")
);

-- CreateTable
CREATE TABLE "DocumentsToAccounts" (
    "document_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,

    CONSTRAINT "DocumentsToAccounts_pkey" PRIMARY KEY ("document_id","account_id")
);

-- CreateTable
CREATE TABLE "AccountWatchers" (
    "account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "AccountWatchers_pkey" PRIMARY KEY ("account_id","user_id")
);

-- CreateTable
CREATE TABLE "BoardWatchers" (
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "BoardWatchers_pkey" PRIMARY KEY ("board_id","user_id")
);

-- CreateTable
CREATE TABLE "ContactsToOpportunities" (
    "contact_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,

    CONSTRAINT "ContactsToOpportunities_pkey" PRIMARY KEY ("contact_id","opportunity_id")
);

-- CreateIndex
CREATE INDEX "crm_Accounts_assigned_to_idx" ON "crm_Accounts"("assigned_to");

-- CreateIndex
CREATE INDEX "crm_Accounts_industry_idx" ON "crm_Accounts"("industry");

-- CreateIndex
CREATE INDEX "crm_Accounts_createdBy_idx" ON "crm_Accounts"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Accounts_updatedBy_idx" ON "crm_Accounts"("updatedBy");

-- CreateIndex
CREATE INDEX "crm_Accounts_status_idx" ON "crm_Accounts"("status");

-- CreateIndex
CREATE INDEX "crm_Accounts_type_idx" ON "crm_Accounts"("type");

-- CreateIndex
CREATE INDEX "crm_Accounts_createdAt_idx" ON "crm_Accounts"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Leads_assigned_to_idx" ON "crm_Leads"("assigned_to");

-- CreateIndex
CREATE INDEX "crm_Leads_accountsIDs_idx" ON "crm_Leads"("accountsIDs");

-- CreateIndex
CREATE INDEX "crm_Leads_createdBy_idx" ON "crm_Leads"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Leads_updatedBy_idx" ON "crm_Leads"("updatedBy");

-- CreateIndex
CREATE INDEX "crm_Leads_status_idx" ON "crm_Leads"("status");

-- CreateIndex
CREATE INDEX "crm_Leads_type_idx" ON "crm_Leads"("type");

-- CreateIndex
CREATE INDEX "crm_Leads_createdAt_idx" ON "crm_Leads"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Opportunities_account_idx" ON "crm_Opportunities"("account");

-- CreateIndex
CREATE INDEX "crm_Opportunities_assigned_to_idx" ON "crm_Opportunities"("assigned_to");

-- CreateIndex
CREATE INDEX "crm_Opportunities_campaign_idx" ON "crm_Opportunities"("campaign");

-- CreateIndex
CREATE INDEX "crm_Opportunities_contact_idx" ON "crm_Opportunities"("contact");

-- CreateIndex
CREATE INDEX "crm_Opportunities_created_by_idx" ON "crm_Opportunities"("created_by");

-- CreateIndex
CREATE INDEX "crm_Opportunities_sales_stage_idx" ON "crm_Opportunities"("sales_stage");

-- CreateIndex
CREATE INDEX "crm_Opportunities_type_idx" ON "crm_Opportunities"("type");

-- CreateIndex
CREATE INDEX "crm_Opportunities_status_idx" ON "crm_Opportunities"("status");

-- CreateIndex
CREATE INDEX "crm_Opportunities_createdAt_idx" ON "crm_Opportunities"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Opportunities_close_date_idx" ON "crm_Opportunities"("close_date");

-- CreateIndex
CREATE INDEX "crm_Opportunities_status_sales_stage_idx" ON "crm_Opportunities"("status", "sales_stage");

-- CreateIndex
CREATE INDEX "crm_Contacts_assigned_to_idx" ON "crm_Contacts"("assigned_to");

-- CreateIndex
CREATE INDEX "crm_Contacts_created_by_idx" ON "crm_Contacts"("created_by");

-- CreateIndex
CREATE INDEX "crm_Contacts_accountsIDs_idx" ON "crm_Contacts"("accountsIDs");

-- CreateIndex
CREATE INDEX "crm_Contacts_createdBy_idx" ON "crm_Contacts"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Contacts_updatedBy_idx" ON "crm_Contacts"("updatedBy");

-- CreateIndex
CREATE INDEX "crm_Contacts_status_idx" ON "crm_Contacts"("status");

-- CreateIndex
CREATE INDEX "crm_Contacts_type_idx" ON "crm_Contacts"("type");

-- CreateIndex
CREATE INDEX "crm_Contacts_cratedAt_idx" ON "crm_Contacts"("cratedAt");

-- CreateIndex
CREATE INDEX "crm_Contacts_last_activity_idx" ON "crm_Contacts"("last_activity");

-- CreateIndex
CREATE INDEX "crm_Contracts_account_idx" ON "crm_Contracts"("account");

-- CreateIndex
CREATE INDEX "crm_Contracts_assigned_to_idx" ON "crm_Contracts"("assigned_to");

-- CreateIndex
CREATE INDEX "crm_Contracts_createdBy_idx" ON "crm_Contracts"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Contracts_updatedBy_idx" ON "crm_Contracts"("updatedBy");

-- CreateIndex
CREATE INDEX "crm_Contracts_status_idx" ON "crm_Contracts"("status");

-- CreateIndex
CREATE INDEX "crm_Contracts_startDate_idx" ON "crm_Contracts"("startDate");

-- CreateIndex
CREATE INDEX "crm_Contracts_endDate_idx" ON "crm_Contracts"("endDate");

-- CreateIndex
CREATE INDEX "crm_Contracts_createdAt_idx" ON "crm_Contracts"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Contracts_startDate_endDate_idx" ON "crm_Contracts"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Boards_user_idx" ON "Boards"("user");

-- CreateIndex
CREATE INDEX "Boards_createdBy_idx" ON "Boards"("createdBy");

-- CreateIndex
CREATE INDEX "Boards_updatedBy_idx" ON "Boards"("updatedBy");

-- CreateIndex
CREATE INDEX "Boards_favourite_idx" ON "Boards"("favourite");

-- CreateIndex
CREATE INDEX "Boards_visibility_idx" ON "Boards"("visibility");

-- CreateIndex
CREATE INDEX "Boards_createdAt_idx" ON "Boards"("createdAt");

-- CreateIndex
CREATE INDEX "Boards_user_favourite_idx" ON "Boards"("user", "favourite");

-- CreateIndex
CREATE INDEX "Invoices_invoice_state_id_idx" ON "Invoices"("invoice_state_id");

-- CreateIndex
CREATE INDEX "Invoices_assigned_user_id_idx" ON "Invoices"("assigned_user_id");

-- CreateIndex
CREATE INDEX "Invoices_assigned_account_id_idx" ON "Invoices"("assigned_account_id");

-- CreateIndex
CREATE INDEX "Invoices_last_updated_by_idx" ON "Invoices"("last_updated_by");

-- CreateIndex
CREATE INDEX "Invoices_status_idx" ON "Invoices"("status");

-- CreateIndex
CREATE INDEX "Invoices_invoice_type_idx" ON "Invoices"("invoice_type");

-- CreateIndex
CREATE INDEX "Invoices_date_created_idx" ON "Invoices"("date_created");

-- CreateIndex
CREATE INDEX "Invoices_date_due_idx" ON "Invoices"("date_due");

-- CreateIndex
CREATE INDEX "Invoices_favorite_idx" ON "Invoices"("favorite");

-- CreateIndex
CREATE INDEX "Invoices_status_date_created_idx" ON "Invoices"("status", "date_created");

-- CreateIndex
CREATE INDEX "Documents_created_by_user_idx" ON "Documents"("created_by_user");

-- CreateIndex
CREATE INDEX "Documents_assigned_user_idx" ON "Documents"("assigned_user");

-- CreateIndex
CREATE INDEX "Documents_document_type_idx" ON "Documents"("document_type");

-- CreateIndex
CREATE INDEX "Documents_createdBy_idx" ON "Documents"("createdBy");

-- CreateIndex
CREATE INDEX "Documents_status_idx" ON "Documents"("status");

-- CreateIndex
CREATE INDEX "Documents_visibility_idx" ON "Documents"("visibility");

-- CreateIndex
CREATE INDEX "Documents_favourite_idx" ON "Documents"("favourite");

-- CreateIndex
CREATE INDEX "Documents_createdAt_idx" ON "Documents"("createdAt");

-- CreateIndex
CREATE INDEX "Documents_document_system_type_idx" ON "Documents"("document_system_type");

-- CreateIndex
CREATE INDEX "Sections_board_idx" ON "Sections"("board");

-- CreateIndex
CREATE INDEX "Tasks_user_idx" ON "Tasks"("user");

-- CreateIndex
CREATE INDEX "Tasks_section_idx" ON "Tasks"("section");

-- CreateIndex
CREATE INDEX "Tasks_createdBy_idx" ON "Tasks"("createdBy");

-- CreateIndex
CREATE INDEX "Tasks_updatedBy_idx" ON "Tasks"("updatedBy");

-- CreateIndex
CREATE INDEX "Tasks_priority_idx" ON "Tasks"("priority");

-- CreateIndex
CREATE INDEX "Tasks_taskStatus_idx" ON "Tasks"("taskStatus");

-- CreateIndex
CREATE INDEX "Tasks_dueDateAt_idx" ON "Tasks"("dueDateAt");

-- CreateIndex
CREATE INDEX "Tasks_createdAt_idx" ON "Tasks"("createdAt");

-- CreateIndex
CREATE INDEX "Tasks_user_taskStatus_idx" ON "Tasks"("user", "taskStatus");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_user_idx" ON "crm_Accounts_Tasks"("user");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_account_idx" ON "crm_Accounts_Tasks"("account");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_createdBy_idx" ON "crm_Accounts_Tasks"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_updatedBy_idx" ON "crm_Accounts_Tasks"("updatedBy");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_priority_idx" ON "crm_Accounts_Tasks"("priority");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_taskStatus_idx" ON "crm_Accounts_Tasks"("taskStatus");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_dueDateAt_idx" ON "crm_Accounts_Tasks"("dueDateAt");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_createdAt_idx" ON "crm_Accounts_Tasks"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_account_taskStatus_idx" ON "crm_Accounts_Tasks"("account", "taskStatus");

-- CreateIndex
CREATE INDEX "tasksComments_task_idx" ON "tasksComments"("task");

-- CreateIndex
CREATE INDEX "tasksComments_user_idx" ON "tasksComments"("user");

-- CreateIndex
CREATE INDEX "tasksComments_assigned_crm_account_task_idx" ON "tasksComments"("assigned_crm_account_task");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "Users_email_idx" ON "Users"("email");

-- CreateIndex
CREATE INDEX "Users_userStatus_idx" ON "Users"("userStatus");

-- CreateIndex
CREATE INDEX "Users_userLanguage_idx" ON "Users"("userLanguage");

-- CreateIndex
CREATE INDEX "Users_is_admin_idx" ON "Users"("is_admin");

-- CreateIndex
CREATE INDEX "Users_is_account_admin_idx" ON "Users"("is_account_admin");

-- CreateIndex
CREATE INDEX "Users_created_on_idx" ON "Users"("created_on");

-- CreateIndex
CREATE INDEX "Users_lastLoginAt_idx" ON "Users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "secondBrain_notions_user_idx" ON "secondBrain_notions"("user");

-- CreateIndex
CREATE INDEX "openAi_keys_user_idx" ON "openAi_keys"("user");

-- CreateIndex
CREATE INDEX "DocumentsToInvoices_document_id_idx" ON "DocumentsToInvoices"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToInvoices_invoice_id_idx" ON "DocumentsToInvoices"("invoice_id");

-- CreateIndex
CREATE INDEX "DocumentsToOpportunities_document_id_idx" ON "DocumentsToOpportunities"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToOpportunities_opportunity_id_idx" ON "DocumentsToOpportunities"("opportunity_id");

-- CreateIndex
CREATE INDEX "DocumentsToContacts_document_id_idx" ON "DocumentsToContacts"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToContacts_contact_id_idx" ON "DocumentsToContacts"("contact_id");

-- CreateIndex
CREATE INDEX "DocumentsToTasks_document_id_idx" ON "DocumentsToTasks"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToTasks_task_id_idx" ON "DocumentsToTasks"("task_id");

-- CreateIndex
CREATE INDEX "DocumentsToCrmAccountsTasks_document_id_idx" ON "DocumentsToCrmAccountsTasks"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToCrmAccountsTasks_crm_accounts_task_id_idx" ON "DocumentsToCrmAccountsTasks"("crm_accounts_task_id");

-- CreateIndex
CREATE INDEX "DocumentsToLeads_document_id_idx" ON "DocumentsToLeads"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToLeads_lead_id_idx" ON "DocumentsToLeads"("lead_id");

-- CreateIndex
CREATE INDEX "DocumentsToAccounts_document_id_idx" ON "DocumentsToAccounts"("document_id");

-- CreateIndex
CREATE INDEX "DocumentsToAccounts_account_id_idx" ON "DocumentsToAccounts"("account_id");

-- CreateIndex
CREATE INDEX "AccountWatchers_account_id_idx" ON "AccountWatchers"("account_id");

-- CreateIndex
CREATE INDEX "AccountWatchers_user_id_idx" ON "AccountWatchers"("user_id");

-- CreateIndex
CREATE INDEX "BoardWatchers_board_id_idx" ON "BoardWatchers"("board_id");

-- CreateIndex
CREATE INDEX "BoardWatchers_user_id_idx" ON "BoardWatchers"("user_id");

-- CreateIndex
CREATE INDEX "ContactsToOpportunities_contact_id_idx" ON "ContactsToOpportunities"("contact_id");

-- CreateIndex
CREATE INDEX "ContactsToOpportunities_opportunity_id_idx" ON "ContactsToOpportunities"("opportunity_id");

-- AddForeignKey
ALTER TABLE "crm_Accounts" ADD CONSTRAINT "crm_Accounts_industry_fkey" FOREIGN KEY ("industry") REFERENCES "crm_Industry_Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts" ADD CONSTRAINT "crm_Accounts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Leads" ADD CONSTRAINT "crm_Leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Leads" ADD CONSTRAINT "crm_Leads_accountsIDs_fkey" FOREIGN KEY ("accountsIDs") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_type_fkey" FOREIGN KEY ("type") REFERENCES "crm_Opportunities_Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_sales_stage_fkey" FOREIGN KEY ("sales_stage") REFERENCES "crm_Opportunities_Sales_Stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_account_fkey" FOREIGN KEY ("account") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_campaign_fkey" FOREIGN KEY ("campaign") REFERENCES "crm_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Contacts" ADD CONSTRAINT "crm_Contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Contacts" ADD CONSTRAINT "crm_Contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Contacts" ADD CONSTRAINT "crm_Contacts_accountsIDs_fkey" FOREIGN KEY ("accountsIDs") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Contracts" ADD CONSTRAINT "crm_Contracts_account_fkey" FOREIGN KEY ("account") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Contracts" ADD CONSTRAINT "crm_Contracts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boards" ADD CONSTRAINT "Boards_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_invoice_state_id_fkey" FOREIGN KEY ("invoice_state_id") REFERENCES "invoice_States"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_assigned_account_id_fkey" FOREIGN KEY ("assigned_account_id") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_assigned_user_fkey" FOREIGN KEY ("assigned_user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_document_type_fkey" FOREIGN KEY ("document_type") REFERENCES "Documents_Types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sections" ADD CONSTRAINT "Sections_board_fkey" FOREIGN KEY ("board") REFERENCES "Boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_section_fkey" FOREIGN KEY ("section") REFERENCES "Sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_account_fkey" FOREIGN KEY ("account") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_assigned_crm_account_task_fkey" FOREIGN KEY ("assigned_crm_account_task") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_task_fkey" FOREIGN KEY ("task") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasksComments" ADD CONSTRAINT "tasksComments_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondBrain_notions" ADD CONSTRAINT "secondBrain_notions_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openAi_keys" ADD CONSTRAINT "openAi_keys_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToInvoices" ADD CONSTRAINT "DocumentsToInvoices_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToInvoices" ADD CONSTRAINT "DocumentsToInvoices_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToOpportunities" ADD CONSTRAINT "DocumentsToOpportunities_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToOpportunities" ADD CONSTRAINT "DocumentsToOpportunities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_Opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToContacts" ADD CONSTRAINT "DocumentsToContacts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToContacts" ADD CONSTRAINT "DocumentsToContacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_Contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToTasks" ADD CONSTRAINT "DocumentsToTasks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToTasks" ADD CONSTRAINT "DocumentsToTasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToCrmAccountsTasks" ADD CONSTRAINT "DocumentsToCrmAccountsTasks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToCrmAccountsTasks" ADD CONSTRAINT "DocumentsToCrmAccountsTasks_crm_accounts_task_id_fkey" FOREIGN KEY ("crm_accounts_task_id") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToLeads" ADD CONSTRAINT "DocumentsToLeads_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToLeads" ADD CONSTRAINT "DocumentsToLeads_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_Leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToAccounts" ADD CONSTRAINT "DocumentsToAccounts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentsToAccounts" ADD CONSTRAINT "DocumentsToAccounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "crm_Accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountWatchers" ADD CONSTRAINT "AccountWatchers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "crm_Accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountWatchers" ADD CONSTRAINT "AccountWatchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardWatchers" ADD CONSTRAINT "BoardWatchers_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "Boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardWatchers" ADD CONSTRAINT "BoardWatchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactsToOpportunities" ADD CONSTRAINT "ContactsToOpportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_Contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactsToOpportunities" ADD CONSTRAINT "ContactsToOpportunities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_Opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

