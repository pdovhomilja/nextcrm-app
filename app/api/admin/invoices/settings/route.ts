import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prismadb.invoice_Settings.findFirst();

  if (!settings) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({ data: settings });
}

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Upsert: create if not exists, update if exists
  const existing = await prismadb.invoice_Settings.findFirst();

  if (existing) {
    const settings = await prismadb.invoice_Settings.update({
      where: { id: existing.id },
      data: {
        ...(body.baseCurrency !== undefined && { baseCurrency: body.baseCurrency }),
        ...(body.defaultSeriesId !== undefined && { defaultSeriesId: body.defaultSeriesId }),
        ...(body.defaultTaxRateId !== undefined && { defaultTaxRateId: body.defaultTaxRateId }),
        ...(body.defaultDueDays !== undefined && { defaultDueDays: body.defaultDueDays }),
        ...(body.bankName !== undefined && { bankName: body.bankName }),
        ...(body.bankAccount !== undefined && { bankAccount: body.bankAccount }),
        ...(body.iban !== undefined && { iban: body.iban }),
        ...(body.swift !== undefined && { swift: body.swift }),
        ...(body.footerText !== undefined && { footerText: body.footerText }),
      },
    });
    return NextResponse.json({ data: settings });
  }

  // Create new settings
  if (!body.baseCurrency) {
    return NextResponse.json(
      { error: "baseCurrency is required when creating settings" },
      { status: 400 }
    );
  }

  const settings = await prismadb.invoice_Settings.create({
    data: {
      baseCurrency: body.baseCurrency,
      defaultSeriesId: body.defaultSeriesId ?? null,
      defaultTaxRateId: body.defaultTaxRateId ?? null,
      defaultDueDays: body.defaultDueDays ?? 14,
      bankName: body.bankName ?? null,
      bankAccount: body.bankAccount ?? null,
      iban: body.iban ?? null,
      swift: body.swift ?? null,
      footerText: body.footerText ?? null,
    },
  });

  return NextResponse.json({ data: settings }, { status: 201 });
}
