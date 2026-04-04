import { NextResponse } from "next/server";
import { getEnabledCurrencies } from "@/lib/currency";

export async function GET() {
  const currencies = await getEnabledCurrencies();
  return NextResponse.json(
    currencies.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol }))
  );
}
