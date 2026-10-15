import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { parseDocumentFile, normalizeHeader } from "@/lib/import/document-ocr";

export const runtime = "nodejs";

export interface ExtractedContact {
  first_name?: string;
  last_name: string;
  mobile_phone?: string;
  office_phone?: string;
  email?: string;
  personal_email?: string;
  website?: string;
  birthday?: string;
  description?: string;
  position?: string;
  social_twitter?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_skype?: string;
  social_youtube?: string;
  social_tiktok?: string;
}

function mapRowToContact(row: Record<string, string>): ExtractedContact {
  const normMap = new Map(
    Object.entries(row).map(([k, v]) => [normalizeHeader(k), String(v ?? "").trim()])
  );

  const firstName =
    normMap.get("firstname") ||
    normMap.get("first") ||
    "";

  let lastName =
    normMap.get("lastname") ||
    normMap.get("last") ||
    normMap.get("surname") ||
    "";

  const fullName = normMap.get("name") || normMap.get("fullname") || "";
  if (!lastName && fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length > 1) {
      lastName = parts.pop() || "Contact";
    } else {
      lastName = parts[0] || "Contact";
    }
  }

  if (!lastName && !firstName) {
    lastName = "Unknown Contact";
  }

  const mobile_phone =
    normMap.get("mobilephone") ||
    normMap.get("mobile") ||
    normMap.get("cellphone") ||
    normMap.get("phone") ||
    "";

  const office_phone =
    normMap.get("officephone") ||
    normMap.get("workphone") ||
    normMap.get("phone") ||
    "";

  const email =
    normMap.get("email") ||
    normMap.get("workemail") ||
    normMap.get("emailaddress") ||
    "";

  const personal_email =
    normMap.get("personalemail") ||
    normMap.get("homeemail") ||
    "";

  const website =
    normMap.get("website") ||
    normMap.get("url") ||
    "";

  const birthday =
    normMap.get("birthday") ||
    normMap.get("birthdate") ||
    normMap.get("dob") ||
    "";

  const description =
    normMap.get("description") ||
    normMap.get("notes") ||
    "";

  const position =
    normMap.get("position") ||
    normMap.get("jobtitle") ||
    normMap.get("title") ||
    "";

  return {
    first_name: firstName,
    last_name: lastName || "Contact",
    mobile_phone,
    office_phone,
    email,
    personal_email,
    website,
    birthday,
    description,
    position,
    social_twitter: normMap.get("twitter") || normMap.get("socialtwitter") || "",
    social_facebook: normMap.get("facebook") || normMap.get("socialfacebook") || "",
    social_linkedin: normMap.get("linkedin") || normMap.get("sociallinkedin") || "",
    social_skype: normMap.get("skype") || normMap.get("socialskype") || "",
    social_youtube: normMap.get("youtube") || normMap.get("socialyoutube") || "",
    social_tiktok: normMap.get("tiktok") || normMap.get("socialtiktok") || "",
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  // 1. Bulk Insert Contacts
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { contacts } = body;

      if (!Array.isArray(contacts) || contacts.length === 0) {
        return NextResponse.json({ error: "No contacts provided to import" }, { status: 400 });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const item of contacts) {
        if (!item.last_name && !item.first_name) continue;

        try {
          await prismadb.crm_Contacts.create({
            data: {
              v: 0,
              first_name: item.first_name || undefined,
              last_name: item.last_name || "Contact",
              mobile_phone: item.mobile_phone || undefined,
              office_phone: item.office_phone || undefined,
              email: item.email || undefined,
              personal_email: item.personal_email || undefined,
              website: item.website || undefined,
              birthday: item.birthday || undefined,
              description: item.description || undefined,
              position: item.position || undefined,
              status: true,
              social_twitter: item.social_twitter || undefined,
              social_facebook: item.social_facebook || undefined,
              social_linkedin: item.social_linkedin || undefined,
              social_skype: item.social_skype || undefined,
              social_youtube: item.social_youtube || undefined,
              social_tiktok: item.social_tiktok || undefined,
              createdBy: session.user.id,
              updatedBy: session.user.id,
              assigned_to: session.user.id,
            },
          });
          importedCount++;
        } catch (err: any) {
          errors.push(`Failed contact "${item.first_name || ""} ${item.last_name}": ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        importedCount,
        skippedCount: contacts.length - importedCount,
        errors,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to process contacts bulk import" }, { status: 500 });
    }
  }

  // 2. Parse Document / Spreadsheet / PDF OCR File
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const { rows, method } = await parseDocumentFile(file);
    const extractedContacts: ExtractedContact[] = rows.map((r) => mapRowToContact(r));

    return NextResponse.json({
      success: true,
      fileName: file.name,
      extractionMethod: method,
      totalDetected: extractedContacts.length,
      contacts: extractedContacts,
    });
  } catch (err: any) {
    console.error("[CONTACTS_BULK_IMPORT_PARSE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to parse contact file" }, { status: 500 });
  }
}
