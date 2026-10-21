"use server";

import { revalidatePath } from "next/cache";
import { buildBulkWorkEmails } from "@/lib/admin/bulk-user-addresses";
import { getOrgEmailDomain } from "@/lib/org-work-email";
import { createEmployee } from "./invite-user";

export async function createBulkEmployees(input: {
  prefix: string;
  middix: string;
  suffix: string;
  count: number;
  password: string;
  confirmPassword: string;
  role: string;
}) {
  if (input.password !== input.confirmPassword) {
    return { error: "Password and confirm password do not match" };
  }

  const built = buildBulkWorkEmails({
    prefix: input.prefix,
    middix: input.middix,
    suffix: input.suffix,
    count: input.count,
    domain: getOrgEmailDomain(),
  });
  if ("error" in built) return built;

  const created: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const workEmail of built.emails) {
    const result = await createEmployee({
      workEmail,
      password: input.password,
      role: input.role,
    });
    if ("error" in result) failed.push({ email: workEmail, error: result.error });
    else created.push(workEmail);
  }

  revalidatePath("/[locale]/(routes)/admin/users", "page");

  if (created.length === 0) {
    return { error: failed[0]?.error ?? "No users were created", data: { created, failed } };
  }

  return { data: { created, failed } };
}
