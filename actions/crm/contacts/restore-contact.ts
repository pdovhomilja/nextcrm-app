"use server";
import * as svc from "@/lib/crm/contacts/service";
import { runContactAction } from "./run";

export const restoreContact = async (contactId: string) => {
  if (!contactId) return { error: "contactId is required" };

  // Restore never mapped plugin rule errors; kept that way.
  return runContactAction(
    { verb: "restore", pluginRules: false, alsoRevalidate: "/[locale]/(routes)/admin/audit-log" },
    async (user) => {
      await svc.restoreContact(user, contactId);
      return { success: true };
    },
  );
};
