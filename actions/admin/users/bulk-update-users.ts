"use server";

import { revalidatePath } from "next/cache";
import { updateEmployee } from "./update-user";

export async function bulkUpdateEmployees(input: {
  userIds: string[];
  role?: string;
  password?: string;
}) {
  const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))];
  if (userIds.length === 0) return { error: "Select at least one user" };

  const password = input.password?.trim() ?? "";
  const role = input.role?.trim() ?? "";
  if (!password && !role) return { error: "Choose a role, a password, or both" };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters" };

  const updated: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const userId of userIds) {
    const result = await updateEmployee({
      userId,
      ...(role ? { role } : {}),
      ...(password ? { password } : {}),
    });
    if ("error" in result) failed.push({ id: userId, error: result.error });
    else updated.push(userId);
  }

  revalidatePath("/[locale]/(routes)/admin/users", "page");
  if (updated.length === 0) {
    return { error: failed[0]?.error ?? "No users were updated", data: { updated, failed } };
  }
  return { data: { updated, failed } };
}
