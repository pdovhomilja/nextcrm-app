import type { AuthzUser } from "../session";
import { NO_ROWS, isUnhandledRole } from "./unhandled-role";

export interface ReportScope {
  opportunity: Record<string, unknown>;
  lead: Record<string, unknown>;
  account: Record<string, unknown>;
  contact: Record<string, unknown>;
  task: Record<string, unknown>;
  campaign: Record<string, unknown>;
  allowUserDirectory: boolean;
}

const EMPTY: ReportScope = {
  opportunity: {},
  lead: {},
  account: {},
  contact: {},
  task: {},
  campaign: {},
  allowUserDirectory: true,
};

export function getReportScope(user: AuthzUser): ReportScope {
  if (user.role === "admin" || user.role === "manager") return EMPTY;
  if (isUnhandledRole(user)) {
    return {
      opportunity: { ...NO_ROWS },
      lead: { ...NO_ROWS },
      account: { ...NO_ROWS },
      contact: { ...NO_ROWS },
      task: { ...NO_ROWS },
      campaign: { ...NO_ROWS },
      allowUserDirectory: false,
    };
  }
  return {
    opportunity: {
      OR: [{ assigned_to: user.id }, { createdBy: user.id }],
    },
    lead: { OR: [{ assigned_to: user.id }, { createdBy: user.id }] },
    account: {
      OR: [
        { assigned_to: user.id },
        { createdBy: user.id },
        { watchers: { some: { user_id: user.id } } },
      ],
    },
    contact: {
      OR: [
        { assigned_to: user.id },
        { createdBy: user.id },
      ],
    },
    task: { user: user.id },
    campaign: { created_by: user.id },
    allowUserDirectory: false,
  };
}
