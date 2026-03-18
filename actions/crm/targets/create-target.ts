"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createTarget = async (data: {
  last_name: string;
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
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { last_name, email, mobile_phone, ...rest } = data;
  if (!last_name) return { error: "last_name is required" };
  if (!email && !mobile_phone) return { error: "email or mobile_phone is required" };

  try {
    const target = await prismadb.crm_Targets.create({
      data: { last_name, email, mobile_phone, ...rest, created_by: (session.user as any).id },
    });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { data: target };
  } catch (error) {
    return { error: "Failed to create target" };
  }
};
