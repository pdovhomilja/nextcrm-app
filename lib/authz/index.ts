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
