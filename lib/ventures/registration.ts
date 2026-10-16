import type { VentureApp } from "@prisma/client";

/** Minimum CRM-side registration before provisioning / task modules (phase 2+). */
export function isVentureRegistrationComplete(
  venture: Pick<
    VentureApp,
    | "name"
    | "slug"
    | "description"
    | "gitRepositoryUrl"
    | "assignedSubdomain"
    | "adminEmail"
    | "externalUrl"
    | "notes"
    | "envEncrypted"
  >,
): boolean {
  return Boolean(
    venture.name?.trim() &&
      venture.slug?.trim() &&
      venture.description?.trim() &&
      venture.gitRepositoryUrl?.trim() &&
      venture.assignedSubdomain?.trim() &&
      venture.adminEmail?.trim() &&
      venture.externalUrl?.trim() &&
      venture.notes?.trim() &&
      venture.envEncrypted,
  );
}
