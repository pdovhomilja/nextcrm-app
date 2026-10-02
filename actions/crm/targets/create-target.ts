"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { normalizeTargetType, requiredIdentityField } from "@/lib/crm/target-type";
import { industryPrefillData } from "@/lib/homepage/prompt-layers/prefill-industry"; // fork

export const createTarget = async (data: {
  type?: "INDIVIDUAL" | "COMPANY";
  last_name?: string;
  first_name?: string;
  email?: string;
  mobile_phone?: string;
  office_phone?: string;
  company?: string;
  company_website?: string;
  personal_website?: string;
  position?: string;
  social_x?: string;
  social_linkedin?: string;
  social_instagram?: string;
  social_facebook?: string;
  personal_email?: string;
  company_email?: string;
  company_phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  employees?: string;
  description?: string;
  status?: boolean;
}) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const { last_name, email, mobile_phone, ...rest } = data;
  const type = normalizeTargetType(data.type);
  const required = requiredIdentityField(type);
  if (required === "company" && !data.company) return { error: "A company target requires a company name" };
  if (required === "last_name" && !last_name) return { error: "An individual target requires a last name" };

  try {
    const target = await prismadb.crm_Targets.create({
      data: {
        last_name: last_name ?? "", email, mobile_phone, ...rest, type, created_by: user.id,
        ...(await industryPrefillData(rest.industry)), // fork: best-effort Industry pre-match
      },
    });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { data: target };
  } catch (error) {
    return { error: "Failed to create target" };
  }
};
