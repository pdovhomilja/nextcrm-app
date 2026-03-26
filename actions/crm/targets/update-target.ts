"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateTarget = async (data: {
  id: string;
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
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { id, ...rest } = data;
  if (!id) return { error: "id is required" };

  try {
    const target = await prismadb.crm_Targets.update({
      where: { id },
      data: { ...rest, updatedBy: (session.user as any).id },
    });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { data: target };
  } catch (error) {
    return { error: "Failed to update target" };
  }
};
