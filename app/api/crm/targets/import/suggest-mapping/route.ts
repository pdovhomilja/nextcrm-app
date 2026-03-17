import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openAiHelper } from "@/lib/openai";

const TARGET_FIELDS = [
  "last_name",
  "first_name",
  "email",
  "mobile_phone",
  "office_phone",
  "company",
  "position",
  "company_website",
  "personal_website",
  "social_linkedin",
  "social_x",
  "social_instagram",
  "social_facebook",
];

function fuzzyMatch(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[\s_\-]/g, "");
  for (const field of TARGET_FIELDS) {
    if (field.replace(/_/g, "") === normalized) return field;
  }
  // common aliases
  const aliases: Record<string, string> = {
    lastname: "last_name",
    surname: "last_name",
    familyname: "last_name",
    firstname: "first_name",
    givenname: "first_name",
    name: "first_name",
    mail: "email",
    emailaddress: "email",
    phone: "mobile_phone",
    mobile: "mobile_phone",
    cellphone: "mobile_phone",
    mobilephone: "mobile_phone",
    officephone: "office_phone",
    workphone: "office_phone",
    businessphone: "office_phone",
    companyname: "company",
    organization: "company",
    organisation: "company",
    jobtitle: "position",
    title: "position",
    role: "position",
    website: "company_website",
    companywebsite: "company_website",
    personalwebsite: "personal_website",
    linkedin: "social_linkedin",
    linkedinurl: "social_linkedin",
    twitter: "social_x",
    x: "social_x",
    instagram: "social_instagram",
    facebook: "social_facebook",
  };
  return aliases[normalized] ?? null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { headers } = await req.json();
  if (!Array.isArray(headers)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const openai = await openAiHelper(userId);

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a data mapping assistant. Given a list of CSV column headers and a list of CRM field names, return a JSON object mapping each CSV header to the best matching CRM field, or null if no match. Only use the provided CRM field names as values. Return only valid JSON, no explanation.",
          },
          {
            role: "user",
            content: `CSV headers: ${JSON.stringify(headers)}\n\nCRM fields: ${JSON.stringify(TARGET_FIELDS)}\n\nReturn a JSON object like: { "CSV Header": "crm_field" or null }`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        // Validate that values are only valid fields or null
        const mapping: Record<string, string | null> = {};
        for (const header of headers) {
          const suggested = parsed[header];
          mapping[header] =
            suggested && TARGET_FIELDS.includes(suggested) ? suggested : null;
        }
        return NextResponse.json({ mapping });
      }
    } catch (err) {
      console.error("OpenAI mapping failed, falling back to fuzzy match", err);
    }
  }

  // Fallback: fuzzy match
  const mapping: Record<string, string | null> = {};
  for (const header of headers) {
    mapping[header] = fuzzyMatch(header);
  }
  return NextResponse.json({ mapping });
}
