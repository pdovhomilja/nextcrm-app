import type { PluginContext } from "@nextcrm/plugin-sdk";

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

interface ViesReply {
  valid?: boolean;
  errorWrappers?: { error?: string }[];
}

// true = valid, false = invalid; throws when VIES cannot answer ("cannot verify", never "invalid").
export async function validateVies(vat: string, ctx: Pick<PluginContext, "http">): Promise<boolean> {
  const v = vat.replace(/[\s.-]/g, "").toUpperCase();
  const prefix = v.slice(0, 2);
  const number = v.slice(2);
  if (!/^[A-Z]{2}$/.test(prefix) || !number) return false;
  const res = await ctx.http.fetch(VIES_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode: prefix === "GR" ? "EL" : prefix, vatNumber: number }),
  });
  if (!res.ok) throw new Error(`VIES responded ${res.status}`);
  const reply = (await res.json()) as ViesReply;
  if (typeof reply.valid === "boolean") return reply.valid;
  const code = reply.errorWrappers?.[0]?.error ?? "UNKNOWN";
  if (code === "INVALID_INPUT") return false;
  throw new Error(`VIES unavailable: ${code}`);
}
