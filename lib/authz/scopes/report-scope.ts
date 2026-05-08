import type { AuthzUser } from "../session";

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
