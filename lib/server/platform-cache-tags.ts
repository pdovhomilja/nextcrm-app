import { updateTag } from "next/cache";

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
  updateTag("platform-currencies");
  updateTag("crm-config");
}

export function revalidatePermissionsForRole(role: string) {
  updateTag(`permissions-role-${role}`);
}

export function revalidatePermissionsForUser(userId: string) {
  updateTag(`permissions-${userId}`);
}

export function revalidateUserAccess(userId: string) {
  updateTag(`user-access-${userId}`);
}

export function revalidatePluginNav() {
  updateTag("plugin-nav");
}

export function revalidateDashboardForUser(userId: string) {
  updateTag(`dashboard-${userId}`);
}

export function revalidateContactsList(userId: string, role: string) {
  updateTag(contactsListTag(userId, role));
}

export function revalidateDocumentsList(userId: string, role: string) {
  updateTag(documentsListTag(userId, role));
}

export function revalidateBoardsList(userId: string, role: string) {
  updateTag(boardsListTag(userId, role));
}

export function revalidateAccountPicker(userId: string, role: string) {
  updateTag(accountPickerTag(userId, role));
}
