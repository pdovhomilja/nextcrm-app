jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
const db: Record<string, any> = {
  users: { findUnique: jest.fn() },
  numberSeries: { findFirst: jest.fn(), update: jest.fn() },
  crm_SystemSettings: { findUnique: jest.fn(), upsert: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { getOrderSettings, saveOrderSettings } from "@/app/[locale]/(routes)/admin/orders/_actions/orders";

const as = (role: string) => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  db.users.findUnique.mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};
const input = { name: "Orders", template: "OBJ-{YYYY}-{#####}", resetPolicy: "YEARLY" as const, active: true, emails: false };

beforeEach(() => {
  jest.clearAllMocks();
  db.numberSeries.findFirst.mockResolvedValue({ id: "s1", name: "Orders", template: "ORD-{YYYY}-{####}", resetPolicy: "YEARLY", active: true, counter: 41 });
  db.crm_SystemSettings.findUnique.mockResolvedValue(null);
});

it("reads the default series with a preview and the email switch (default on)", async () => {
  as("admin");
  const s = await getOrderSettings();
  expect(s).toMatchObject({ name: "Orders", template: "ORD-{YYYY}-{####}", emails: true });
  expect(s.preview).toMatch(/^ORD-\d{4}-0042$/);
});

it("saves for admins only and needs a counter token", async () => {
  as("manager");
  await expect(saveOrderSettings(input)).resolves.toEqual({ error: "Forbidden" });
  as("admin");
  await expect(saveOrderSettings({ ...input, template: "OBJ-{YYYY}" })).resolves.toEqual({ error: "invalid" });
  await expect(saveOrderSettings(input)).resolves.toEqual({ data: { ok: true } });
  expect(db.numberSeries.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { name: "Orders", template: "OBJ-{YYYY}-{#####}", resetPolicy: "YEARLY", active: true } });
  expect(db.crm_SystemSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: "orders_approval_emails" }, update: { value: "false" } }));
});
