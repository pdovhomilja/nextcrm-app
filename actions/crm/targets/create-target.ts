"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

export const createTarget = async (data: {
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
  if (!last_name && !data.company) return { error: "last_name or company is required" };

  try {
    const target = await prismadb.crm_Targets.create({
      data: { last_name: last_name ?? "", email, mobile_phone, ...rest, created_by: user.id },
    });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { data: target };
  } catch (error) {
    return { error: "Failed to create target" };
  }
};
