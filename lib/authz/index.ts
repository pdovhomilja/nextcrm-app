export type { AppRole } from "./roles";
export { APP_ROLES, parseRole, mapLegacyRole } from "./roles";
export { AuthenticationError, AuthorizationError } from "./errors";
export {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundOrForbiddenResponse,
} from "./route";
export type { AuthzUser } from "./session";
export {
  requireAuthenticated,
  requireRole,
  isAdmin,
  isManagerOrAdmin,
} from "./session";
export {
  tryScopedUpdateContact,
  tryScopedUpdateTarget,
} from "./scopes/crm";
export {
  assertCanReadContact,
  assertCanWriteContact,
  assertCanReadTarget,
  assertCanWriteTarget,
} from "./scopes/crm";
export {
  filterAuthorizedContactIds,
  filterAuthorizedTargetIds,
  filterAuthorizedAccountIds,
  filterAuthorizedLeadIds,
  filterAuthorizedOpportunityIds,
} from "./scopes/crm";
export {
  assertCanCancelContactEnrichment,
  assertCanCancelTargetEnrichment,
} from "./scopes/crm";
export { assertCanWriteAccount } from "./scopes/crm";
export {
  accountUserScopeOR,
  accountReadScopeWhere,
  assertCanReadAccount,
} from "./scopes/crm";
export {
  leadReadScopeWhere,
  contactReadScopeWhere,
  opportunityReadScopeWhere,
  contractReadScopeWhere,
  assertCanReadLead,
  assertCanReadOpportunity,
  assertCanReadContract,
} from "./scopes/crm";
export {
  targetReadScopeWhere,
  targetListReadScopeWhere,
  assertCanReadTargetList,
} from "./scopes/crm";
export { assertCanReadActivityForEntity } from "./scopes/crm";
export {
  campaignReadScopeWhere,
  campaignTemplateReadScopeWhere,
  assertCanReadCampaign,
  assertCanWriteCampaign,
  assertCanReadTemplate,
  assertCanWriteTemplate,
} from "./scopes/crm";
export {
  documentReadScopeWhere,
  assertCanReadDocument,
  assertCanWriteDocument,
  filterAuthorizedDocumentIds,
} from "./scopes/crm";
export {
  boardReadScopeWhere,
  boardWriteScopeWhere,
  assertCanReadBoard,
  assertCanWriteBoard,
  assertCanReadTask,
  assertCanWriteTask,
} from "./scopes/crm";
export type { ReportScope } from "./scopes/report-scope";
export { getReportScope } from "./scopes/report-scope";
