"use server";
import * as svc from "@/lib/crm/contacts/service";
import { runContactAction } from "./run";

export const deleteContact = async (contactId: string) => {
  if (!contactId) return { error: "contactId is required" };

  return runContactAction({ verb: "delete" }, async (user) => {
    await svc.deleteContact(user, contactId);
    return { success: true };
  });
};
