import { routing } from "@/i18n/routing";

/**
 * Routes a partner may open (partner-role spec, ticket 4). Deny by default:
 * anything not listed here, including any route added later, is refused for a
 * partner by proxy.ts and hidden from his navigation. Patterns are matched
 * against the path without its locale; `*` is one path segment, and a pattern
 * also covers everything below it.
 */
const PARTNER_ROUTES = [
  "/crm/accounts",
  "/crm/contacts",
  "/crm/leads",
  "/crm/opportunities",
  "/crm/tasks",
  "/crm/orders",
  "/sign-in",
  "/api/auth",
  "/api/invoices/*/pdf",
  "/api/documents/*/file",
];

export function isPartnerAllowedPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if ((routing.locales as readonly string[]).includes(segments[0])) segments.shift();
  // The dashboard: counters are scoped to his own records (ticket 3).
  if (segments.length === 0) return true;
  return PARTNER_ROUTES.some((route) => {
    const pattern = route.split("/").filter(Boolean);
    return (
      segments.length >= pattern.length &&
      pattern.every((part, i) => part === "*" || part === segments[i])
    );
  });
}

type NavEntry = { url?: string; items?: { url: string }[] };

/** A partner's navigation: only entries whose route he may open. */
export function partnerNavItems<T extends NavEntry>(items: T[]): T[] {
  return items.flatMap((item) => {
    if (item.items) {
      const sub = item.items.filter((s) => isPartnerAllowedPath(s.url));
      return sub.length ? [{ ...item, items: sub }] : [];
    }
    return item.url && isPartnerAllowedPath(item.url) ? [item] : [];
  });
}
