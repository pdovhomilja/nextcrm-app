export { crmAccountTools } from "./crm-accounts";
export { crmContactTools } from "./crm-contacts";
export { crmLeadTools } from "./crm-leads";
export { crmOpportunityTools } from "./crm-opportunities";
export { crmTargetTools } from "./crm-targets";
export { crmProductTools } from "./crm-products";
export { crmContractTools } from "./crm-contracts";
export { crmActivityTools } from "./crm-activities";
export { crmDocumentTools } from "./crm-documents";
export { crmTargetListTools } from "./crm-target-lists";
export { crmEnrichmentTools } from "./crm-enrichment";
export { crmEmailAccountTools } from "./crm-email-accounts";
export { campaignTools } from "./campaigns";
export { projectTools } from "./projects";
export { reportTools } from "./reports";

import { crmAccountTools } from "./crm-accounts";
import { crmContactTools } from "./crm-contacts";
import { crmLeadTools } from "./crm-leads";
import { crmOpportunityTools } from "./crm-opportunities";
import { crmTargetTools } from "./crm-targets";
import { crmProductTools } from "./crm-products";
import { crmContractTools } from "./crm-contracts";
import { crmActivityTools } from "./crm-activities";
import { crmDocumentTools } from "./crm-documents";
import { crmTargetListTools } from "./crm-target-lists";
import { crmEnrichmentTools } from "./crm-enrichment";
import { crmEmailAccountTools } from "./crm-email-accounts";
import { campaignTools } from "./campaigns";
import { projectTools } from "./projects";
import { reportTools } from "./reports";

export const allTools = [
  ...crmAccountTools,
  ...crmContactTools,
  ...crmLeadTools,
  ...crmOpportunityTools,
  ...crmTargetTools,
  ...crmProductTools,
  ...crmContractTools,
  ...crmActivityTools,
  ...crmDocumentTools,
  ...crmTargetListTools,
  ...crmEnrichmentTools,
  ...crmEmailAccountTools,
  ...campaignTools,
  ...projectTools,
  ...reportTools,
];
