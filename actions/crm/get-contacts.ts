import { cache } from "react";
import {
  requireAuthenticated,
  AuthenticationError,
} from "@/lib/authz";
import { getCachedContactsList } from "@/actions/crm/get-contacts-page-data";

export const getContacts = cache(async () => {
  try {
    const user = await requireAuthenticated();
    return getCachedContactsList(user.id, user.role);
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
});
