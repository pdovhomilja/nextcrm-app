import type { AuthzUser } from "@/lib/authz";
import {
  revalidateBoardsList,
  revalidateContactsList,
  revalidateDashboardForUser,
  revalidateDocumentsList,
  revalidateAccountPicker,
} from "@/lib/server/platform-cache-tags";

export function invalidateAfterContactWrite(user: AuthzUser) {
  revalidateContactsList(user.id, user.role);
  revalidateDashboardForUser(user.id);
}

export function invalidateAfterDocumentWrite(user: AuthzUser) {
  revalidateDocumentsList(user.id, user.role);
  revalidateDashboardForUser(user.id);
}

export function invalidateAfterBoardWrite(user: AuthzUser) {
  revalidateBoardsList(user.id, user.role);
  revalidateDashboardForUser(user.id);
}

export function invalidateAfterAccountWrite(user: AuthzUser) {
  revalidateAccountPicker(user.id, user.role);
  revalidateDashboardForUser(user.id);
}
