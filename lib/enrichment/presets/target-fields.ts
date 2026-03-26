// lib/enrichment/presets/target-fields.ts
import type { EnrichmentField } from "@/lib/enrichment/types";

export const PERSONAL_PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",   description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",            description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",         description: "The company's official website URL", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",            description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",         description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",            description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",            description: "The target's office phone number", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",        description: "The target's personal website URL", type: "string", required: false },
  { name: "personal_email",   displayName: "Personal Email",          description: "The target's personal (non-company) email", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",           description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",            description: "The target's Facebook profile URL", type: "string", required: false },
];

export const PERSONAL_DEFAULTS = ["position", "company", "social_linkedin", "company_website"];

export const COMPANY_PRESET_FIELDS: EnrichmentField[] = [
  { name: "company_website",  displayName: "Company Website",         description: "The company's official website URL", type: "string", required: false },
  { name: "industry",         displayName: "Industry",                description: "Company industry / sector", type: "string", required: false },
  { name: "employees",        displayName: "Employees",               description: "Approximate number of employees", type: "string", required: false },
  { name: "description",      displayName: "Description",             description: "Short company description", type: "string", required: false },
  { name: "city",             displayName: "City",                    description: "Company HQ city", type: "string", required: false },
  { name: "country",          displayName: "Country",                 description: "Company HQ country", type: "string", required: false },
  { name: "company_email",    displayName: "Company Email",           description: "Generic company contact email (info@...)", type: "string", required: false },
  { name: "company_phone",    displayName: "Company Phone",           description: "Main company switchboard number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn (Company Page)", description: "The company's LinkedIn page URL", type: "string", required: false },
];

export const COMPANY_DEFAULTS = ["industry", "employees", "description", "city", "country", "company_website"];

// Combined list for bulk enrichment — covers both personal and company scenarios.
// email is included here because BulkEnrichTargetsModal previously listed it; keep for backwards compat.
export const ALL_TARGET_PRESET_FIELDS: EnrichmentField[] = [
  { name: "email",            displayName: "Email",                   description: "The target's direct email address", type: "string", required: false },
  { name: "personal_email",   displayName: "Personal Email",          description: "The target's personal (non-company) email", type: "string", required: false },
  { name: "position",         displayName: "Position / Job Title",   description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",            description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",         description: "The company's official website URL", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",        description: "The target's personal website URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",            description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",            description: "The target's office phone number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",            description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",         description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",           description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",            description: "The target's Facebook profile URL", type: "string", required: false },
  { name: "company_email",    displayName: "Company Email",           description: "Generic company contact email (info@...)", type: "string", required: false },
  { name: "company_phone",    displayName: "Company Phone",           description: "Main company switchboard number", type: "string", required: false },
  { name: "city",             displayName: "City",                    description: "Company HQ city", type: "string", required: false },
  { name: "country",          displayName: "Country",                 description: "Company HQ country", type: "string", required: false },
  { name: "industry",         displayName: "Industry",                description: "Company industry / sector", type: "string", required: false },
  { name: "employees",        displayName: "Employees",               description: "Number of employees", type: "string", required: false },
  { name: "description",      displayName: "Description",             description: "Short company description", type: "string", required: false },
];

// Single source of truth for which enrichment field names map to which DB columns.
// Used by PATCH /api/crm/targets/[id] and by field name validation in enrich routes.
export const FIELD_MAP: Record<string, string> = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
  personal_email:   "personal_email",
  company_email:    "company_email",
  company_phone:    "company_phone",
  industry:         "industry",
  employees:        "employees",
  description:      "description",
  city:             "city",
  country:          "country",
};
