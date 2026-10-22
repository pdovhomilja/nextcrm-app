import MemoryClient from "mem0ai";

let client: MemoryClient | null | undefined;

export function mem0Configured(): boolean {
  return Boolean(process.env.MEM0_API_KEY?.trim());
}

export function getMem0Client(): MemoryClient | null {
  if (!mem0Configured()) return null;
  if (client === undefined) {
    client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY!.trim() });
  }
  return client;
}

/** CRM users map 1:1 to Mem0 user_id (same idea as openclaw-mem0 userId). */
export function mem0UserId(crmUserId: string): string {
  const prefix = process.env.MEM0_USER_ID_PREFIX?.trim();
  return prefix ? `${prefix}${crmUserId}` : `nextcrm:${crmUserId}`;
}
