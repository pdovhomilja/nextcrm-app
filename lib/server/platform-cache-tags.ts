import { revalidateTag } from "next/cache";

export function contactsListTag(userId: string, role: string) {
  return `contacts-list-${userId}-${role}`;
}

export function documentsListTag(userId: string, role: string) {
  return `documents-list-${userId}-${role}`;
}

export function boardsListTag(userId: string, role: string) {
  return `boards-list-${userId}-${role}`;
}

export function accountPickerTag(userId: string, role: string) {
  return `account-picker-${userId}-${role}`;
}

export function revalidatePlatformCurrencies() {
  revalidateTag("platform-currencies");
  revalidateTag("crm-config");
}

export function revalidatePermissionsForRole(role: string) {
  revalidateTag(`permissions-role-${role}`);
}

export function revalidatePermissionsForUser(userId: string) {
  revalidateTag(`permissions-${userId}`);
}

export function revalidateUserAccess(userId: string) {
  revalidateTag(`user-access-${userId}`);
}

export function revalidatePluginNav() {
  revalidateTag("plugin-nav");
}

export function revalidateDashboardForUser(userId: string) {
  revalidateTag(`dashboard-${userId}`);
}

export function revalidateContactsList(userId: string, role: string) {
  revalidateTag(contactsListTag(userId, role));
}

export function revalidateDocumentsList(userId: string, role: string) {
  revalidateTag(documentsListTag(userId, role));
}

export function revalidateBoardsList(userId: string, role: string) {
  revalidateTag(boardsListTag(userId, role));
}

export function revalidateAccountPicker(userId: string, role: string) {
  revalidateTag(accountPickerTag(userId, role));
}
