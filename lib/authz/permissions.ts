import type { AppRole } from "./roles";

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type FeatureDefinition = {
  key: string;
  label: string;
  group: string;
  /** Route prefixes whose pages require the "view" permission. */
  routes: string[];
};

export const FEATURES = [
  { key: "accounts", label: "Accounts", group: "Sales", routes: ["/crm/accounts"] },
  { key: "contacts", label: "Contacts", group: "Sales", routes: ["/crm/contacts"] },
  { key: "leads", label: "Leads", group: "Sales", routes: ["/crm/leads"] },
  { key: "opportunities", label: "Opportunities", group: "Sales", routes: ["/crm/opportunities"] },
  { key: "contracts", label: "Contracts", group: "Sales", routes: ["/crm/contracts"] },
  { key: "products", label: "Products", group: "Sales", routes: ["/crm/products"] },
  { key: "price_lists", label: "Price lists", group: "Sales", routes: ["/crm/price-lists"] },
  { key: "orders", label: "Orders", group: "Sales", routes: ["/crm/orders"] },
  {
    key: "campaigns",
    label: "Email marketing",
    group: "Marketing",
    routes: ["/campaigns", "/crm/targets", "/crm/target-lists"],
  },
  { key: "projects", label: "Projects", group: "Work", routes: ["/projects"] },
  { key: "emails", label: "E-mails", group: "Work", routes: ["/emails"] },
  { key: "chat", label: "Team chat", group: "Work", routes: ["/chat"] },
  { key: "schedule", label: "Schedule", group: "Work", routes: ["/schedule"] },
  { key: "documents", label: "Documents", group: "Work", routes: ["/documents"] },
  { key: "reports", label: "Reports", group: "Insights", routes: ["/reports"] },
  { key: "invoices", label: "Invoices", group: "Finance", routes: ["/invoices"] },
] as const satisfies readonly FeatureDefinition[];

export type FeatureKey = (typeof FEATURES)[number]["key"];

const FEATURE_KEYS = new Set<string>(FEATURES.map((f) => f.key));
const ACTION_KEYS = new Set<string>(PERMISSION_ACTIONS);

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && FEATURE_KEYS.has(value);
}

export function isPermissionAction(value: unknown): value is PermissionAction {
  return typeof value === "string" && ACTION_KEYS.has(value);
}

export type PermissionMatrix = Record<FeatureKey, Record<PermissionAction, boolean>>;

const ALL: Record<PermissionAction, boolean> = { view: true, create: true, edit: true, delete: true };
const VIEW_ONLY: Record<PermissionAction, boolean> = { view: true, create: false, edit: false, delete: false };

function matrixOf(
  base: Record<PermissionAction, boolean>,
  overrides: Partial<Record<FeatureKey, Record<PermissionAction, boolean>>> = {}
): PermissionMatrix {
  return Object.fromEntries(
    FEATURES.map((f) => [f.key, { ...(overrides[f.key] ?? base) }])
  ) as PermissionMatrix;
}

/**
 * Built-in defaults, used until an admin saves a different role default.
 * Ownership rules in lib/authz/scopes still limit users to their own records.
 */
export const ROLE_DEFAULTS: Record<AppRole, PermissionMatrix> = {
  admin: matrixOf(ALL),
  manager: matrixOf(ALL),
  user: matrixOf(ALL, {
    products: VIEW_ONLY,
    price_lists: VIEW_ONLY,
  }),
};

export type Effect = "ALLOW" | "DENY";

export type PermissionEntry = { feature: string; action: string };
export type RoleEntry = PermissionEntry & { allowed: boolean };
export type EffectEntry = PermissionEntry & { effect: Effect };

export type PermissionInputs = {
  role: AppRole;
  roleOverrides: RoleEntry[];
  groupEntries: EffectEntry[];
  userEntries: EffectEntry[];
};

const keyOf = (feature: string, action: string) => `${feature}:${action}`;

/**
 * Resolves each feature/action: a personal override wins, then groups
 * (any group Deny beats a group Allow), then the role default.
 * Admins always keep full access so nobody can lock out administration.
 */
export function resolvePermissions(inputs: PermissionInputs): PermissionMatrix {
  const matrix = matrixOf(VIEW_ONLY);
  if (inputs.role === "admin") return matrixOf(ALL);

  const roleMap = new Map(inputs.roleOverrides.map((r) => [keyOf(r.feature, r.action), r.allowed]));
  const userMap = new Map(inputs.userEntries.map((u) => [keyOf(u.feature, u.action), u.effect]));
  const groupMap = new Map<string, Effect>();
  for (const g of inputs.groupEntries) {
    const key = keyOf(g.feature, g.action);
    if (groupMap.get(key) !== "DENY") groupMap.set(key, g.effect);
  }

  for (const feature of FEATURES) {
    for (const action of PERMISSION_ACTIONS) {
      const key = keyOf(feature.key, action);
      const personal = userMap.get(key);
      const group = groupMap.get(key);
      let allowed: boolean;
      if (personal) allowed = personal === "ALLOW";
      else if (group) allowed = group === "ALLOW";
      else allowed = roleMap.get(key) ?? ROLE_DEFAULTS[inputs.role][feature.key][action];
      matrix[feature.key][action] = allowed;
    }
  }

  return matrix;
}

/** Feature whose pages live under this path, or null for pages open to everyone. */
export function featureForPath(pathname: string): FeatureKey | null {
  const path = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  let match: { key: FeatureKey; length: number } | null = null;
  for (const feature of FEATURES) {
    for (const route of feature.routes) {
      if ((path === route || path.startsWith(`${route}/`)) && route.length > (match?.length ?? 0)) {
        match = { key: feature.key, length: route.length };
      }
    }
  }
  return match?.key ?? null;
}
