"use server";
import { prismadb } from "@/lib/prisma";
import Papa from "papaparse";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

const MAX_ROWS = 500;

export async function importContacts(
  formData: FormData
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }

  const userId = user.id;
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (data.length > MAX_ROWS) {
    throw new Error(`Import limited to ${MAX_ROWS} rows. File contains ${data.length} rows.`);
  }

  const valid: any[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;

    const lastName = row.last_name?.trim() || row.lastName?.trim() || row["Last Name"]?.trim();
    if (!lastName) {
      errors.push(`Row ${rowNum}: Last Name is required.`);
      return;
    }

    const firstName = row.first_name?.trim() || row.firstName?.trim() || row["First Name"]?.trim() || null;
    const email = row.email?.trim() || row.Email?.trim() || null;
    const personalEmail = row.personal_email?.trim() || row.personalEmail?.trim() || row["Personal Email"]?.trim() || null;
    const officePhone = row.office_phone?.trim() || row.officePhone?.trim() || row["Office Phone"]?.trim() || null;
    const mobilePhone = row.mobile_phone?.trim() || row.mobilePhone?.trim() || row["Mobile Phone"]?.trim() || null;
    const website = row.website?.trim() || row.Website?.trim() || null;
    const position = row.position?.trim() || row.Position?.trim() || null;
    const description = row.description?.trim() || row.Description?.trim() || null;
    const birthday = row.birthday?.trim() || row.Birthday?.trim() || null;
    const socialTwitter = row.social_twitter?.trim() || row.twitter?.trim() || row.Twitter?.trim() || null;
    const socialFacebook = row.social_facebook?.trim() || row.facebook?.trim() || row.Facebook?.trim() || null;
    const socialLinkedin = row.social_linkedin?.trim() || row.linkedin?.trim() || row.LinkedIn?.trim() || null;
    const socialSkype = row.social_skype?.trim() || row.skype?.trim() || row.Skype?.trim() || null;
    const socialYoutube = row.social_youtube?.trim() || row.youtube?.trim() || row.YouTube?.trim() || null;
    const socialTiktok = row.social_tiktok?.trim() || row.tiktok?.trim() || row.TikTok?.trim() || null;

    valid.push({
      v: 0,
      first_name: firstName,
      last_name: lastName,
      email,
      personal_email: personalEmail,
      office_phone: officePhone,
      mobile_phone: mobilePhone,
      website,
      position,
      description,
      birthday,
      status: true,
      social_twitter: socialTwitter,
      social_facebook: socialFacebook,
      social_linkedin: socialLinkedin,
      social_skype: socialSkype,
      social_youtube: socialYoutube,
      social_tiktok: socialTiktok,
      createdBy: userId,
      updatedBy: userId,
      assigned_to: userId,
    });
  });

  if (valid.length > 0) {
    await prismadb.crm_Contacts.createMany({
      data: valid,
      skipDuplicates: true,
    });

    await writeAuditLog({
      entityType: "contact",
      entityId: "bulk_import",
      action: "imported",
      changes: [{ field: "count", old: null, new: valid.length }],
      userId,
    });
  }

  revalidatePath("/[locale]/(routes)/crm/contacts", "page");
  return { imported: valid.length, skipped: errors.length, errors };
}
