import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export const runtime = "nodejs";

type Entity = "leads" | "contacts" | "accounts" | "projects";

const config = {
  leads: {
    label: "Leads", model: "crm_Leads", required: ["lastName"], fields: ["firstName", "lastName", "company", "jobTitle", "email", "phone", "description", "campaign", "refered_by"],
  },
  contacts: {
    label: "Contacts", model: "crm_Contacts", required: ["last_name"], fields: ["first_name", "last_name", "email", "personal_email", "office_phone", "mobile_phone", "position", "website", "social_linkedin", "social_twitter", "description"],
  },
  accounts: {
    label: "Clients / Accounts", model: "crm_Accounts", required: ["name"], fields: ["name", "email", "office_phone", "website", "industry", "description", "billing_city", "billing_country", "status", "type", "annual_revenue"],
  },
  projects: {
    label: "Projects", model: "Boards", required: ["title"], fields: ["title", "description", "visibility", "icon"],
  },
} as const;

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseDateSafe(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapRow(entity: Entity, row: Record<string, unknown>, userId: string) {
  const rules = config[entity];
  const source = new Map(Object.entries(row).map(([key, value]) => [normalise(key), value]));
  const result: Record<string, unknown> = {};
  for (const field of rules.fields) {
    const value = source.get(normalise(field));
    if (value !== undefined && value !== "") result[field] = value;
  }
  if (entity === "leads") {
    result.lastName = String(result.lastName ?? "Unknown");
    result.createdBy = userId;
    result.v = 0;
  } else if (entity === "contacts") {
    result.last_name = String(result.last_name ?? "Unknown");
    result.tags = Array.isArray(result.tags) ? result.tags : [];
    result.notes = Array.isArray(result.notes) ? result.notes : [];
    result.createdBy = userId;
  } else if (entity === "accounts") {
    result.createdBy = userId;
    result.v = 0;
  } else {
    result.user = userId;
    result.createdBy = userId;
    result.v = 0;
    result.position = 0;
    result.sharedWith = [];
  }
  for (const key of ["createdAt", "updatedAt", "created_on", "cratedAt"]) {
    if (key in result) result[key] = parseDateSafe(result[key]);
  }
  return result;
}

function getDelegate(entity: Entity) {
  return prismadb[config[entity].model as keyof typeof prismadb] as any;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entity = (request.nextUrl.searchParams.get("entity") ?? "leads") as Entity;
  if (!(entity in config)) return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  const rules = config[entity];
  const rows = await getDelegate(entity).findMany({ where: entity === "projects" ? { user: session.user.id, deletedAt: null } : { deletedAt: null }, take: 10000, orderBy: { createdAt: "desc" } }).catch(() => []);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(rules.label);
  sheet.columns = rules.fields.map((field) => ({ header: field, key: field, width: Math.max(16, field.length + 3) }));
  rows.forEach((row: Record<string, unknown>) => sheet.addRow(Object.fromEntries(rules.fields.map((field) => [field, row[field] ?? ""]))));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF087EA4" } };
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="vensai-${entity}.xlsx"` } });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const entity = form.get("entity") as Entity;
  const file = form.get("file");
  if (!(entity in config) || !(file instanceof File)) return NextResponse.json({ error: "Choose a supported entity and file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Files must be smaller than 10 MB" }, { status: 413 });
  const workbook = new ExcelJS.Workbook();
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) await workbook.csv.load(await file.text());
  else if (name.endsWith(".xlsx")) await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()));
  else return NextResponse.json({ error: "Use .xlsx or .csv files. Legacy .xls files are not supported." }, { status: 415 });
  const sheet = workbook.worksheets[0];
  if (!sheet) return NextResponse.json({ error: "The workbook has no readable sheet" }, { status: 400 });
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, index) => { headers[index - 1] = String(cell.value ?? ""); });
  const records: Record<string, unknown>[] = [];
  sheet.eachRow((row, index) => { if (index > 1) { const record: Record<string, unknown> = {}; row.eachCell((cell, column) => { record[headers[column - 1] ?? `column_${column}`] = cell.value; }); if (Object.values(record).some(Boolean)) records.push(record); } });
  if (records.length > 5000) return NextResponse.json({ error: "Imports are limited to 5,000 rows per file" }, { status: 413 });
  const delegate = getDelegate(entity);
  let imported = 0;
  let skipped = 0;
  for (const row of records) {
    const data = mapRow(entity, row, session.user.id);
    const missing = config[entity].required.some((field) => !data[field]);
    if (missing) { skipped++; continue; }
    await delegate.create({ data });
    imported++;
  }
  return NextResponse.json({ imported, skipped, total: records.length, mappedHeaders: headers.filter(Boolean) });
}

export const dynamic = "force-dynamic";
