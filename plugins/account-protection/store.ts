import type { Actor, RecordStore } from "@nextcrm/plugin-sdk";
import { dueDay, type Registration } from "./state";

export const K = {
  num: (key: string) => `num:${key}`,
  acct: (id: string) => `acct:${id}`,
  reg: (id: string) => `reg:${id}`,
  due: (day: string, id: string) => `due:${day}:${id}`,
  hist: (id: string, at: string) => `hist:${id}:${at}`,
  freed: (day: string, id: string) => `freed:${day}:${id}`,
  notice: (at: string, rand: string) => `notice:${at}:${rand}`,
  conflict: (id: string) => `conflict:${id}`,
};

export type Reason = "created" | "assigned" | "released" | "expired" | "expired-no-contact" | "install";

export interface HistoryEntry {
  at: string;
  from: string | null;
  to: string | null;
  byUserId: string | null;
  byType: Actor["type"];
  reason: Reason;
}

export interface Notice {
  at: string;
  kind: "blocked-protected" | "blocked-free";
  userId: string | null;
  accountId: string;
}

export async function startRegistration(store: RecordStore, accountId: string, reg: Registration): Promise<void> {
  await store.set(K.reg(accountId), reg);
  await store.set(K.due(dueDay(reg), accountId), {});
}

export async function clearRegistration(store: RecordStore, accountId: string): Promise<Registration | null> {
  const reg = await store.get<Registration>(K.reg(accountId));
  if (!reg) return null;
  await store.delete(K.due(dueDay(reg), accountId));
  await store.delete(K.reg(accountId));
  return reg;
}

export async function addHistory(store: RecordStore, accountId: string, entry: HistoryEntry): Promise<void> {
  await store.set(K.hist(accountId, entry.at), entry);
}

export async function lastHistory(store: RecordStore, accountId: string): Promise<HistoryEntry | null> {
  const all = await store.list(`hist:${accountId}:`);
  return all.length ? (all[all.length - 1].value as HistoryEntry) : null;
}

export async function queueNotice(store: RecordStore, n: Omit<Notice, "at">, now: Date): Promise<void> {
  const at = now.toISOString();
  await store.set(K.notice(at, Math.random().toString(36).slice(2, 8)), { ...n, at });
}
