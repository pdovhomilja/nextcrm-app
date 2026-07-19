import { prismadb } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/email-crypto";

const KEYS = {
  apiToken: "calendly_api_token",
  signingKey: "calendly_signing_key",
  webhookUri: "calendly_webhook_uri",
} as const;

async function read(key: string): Promise<string | null> {
  const row = await prismadb.crm_SystemSettings.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function write(key: string, value: string): Promise<void> {
  await prismadb.crm_SystemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getCalendlySettings() {
  const [token, signing, uri] = await Promise.all([
    read(KEYS.apiToken),
    read(KEYS.signingKey),
    read(KEYS.webhookUri),
  ]);
  return {
    apiToken: token ? decrypt(token) : null,
    signingKey: signing ? decrypt(signing) : null,
    webhookUri: uri,
  };
}

export async function saveCalendlySettings(input: {
  apiToken?: string;
  signingKey?: string;
}): Promise<void> {
  if (input.apiToken) await write(KEYS.apiToken, encrypt(input.apiToken));
  if (input.signingKey) await write(KEYS.signingKey, encrypt(input.signingKey));
}

export async function setCalendlyWebhookUri(uri: string): Promise<void> {
  await write(KEYS.webhookUri, uri);
}
