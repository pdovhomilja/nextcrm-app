import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Papa from "papaparse";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const mappingRaw = formData.get("mapping") as string | null;
  const mapping: Record<string, string> = mappingRaw ? JSON.parse(mappingRaw) : {};

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const valid: any[] = [];
  const errors: string[] = [];

  data.forEach((rawRow, index) => {
    // Apply mapping to normalize the row
    const row: Record<string, string> = {};
    if (Object.keys(mapping).length > 0) {
      Object.entries(mapping).forEach(([csvCol, targetField]) => {
        if (targetField && rawRow[csvCol] !== undefined) {
          row[targetField] = rawRow[csvCol];
        }
      });
    } else {
      // No mapping provided — use raw row as-is (backwards compatibility)
      Object.assign(row, rawRow);
    }

    const last_name = row.last_name;
    const email = row.email;
    const mobile_phone = row.mobile_phone;

    if (!last_name) {
      errors.push(`Row ${index + 2}: missing last_name`);
      return;
    }
    if (!email && !mobile_phone) {
      errors.push(`Row ${index + 2}: missing email or mobile_phone`);
      return;
    }

    valid.push({
      last_name,
      first_name: row.first_name || null,
      email: email || null,
      mobile_phone: mobile_phone || null,
      office_phone: row.office_phone || null,
      company: row.company || null,
      position: row.position || null,
      company_website: row.company_website || null,
      personal_website: row.personal_website || null,
      social_linkedin: row.social_linkedin || null,
      social_x: row.social_x || null,
      social_instagram: row.social_instagram || null,
      social_facebook: row.social_facebook || null,
      created_by: (session.user as any).id,
    });
  });

  if (valid.length > 0) {
    await prismadb.crm_Targets.createMany({ data: valid, skipDuplicates: true });
  }

  return NextResponse.json({ imported: valid.length, skipped: errors.length, errors });
}
