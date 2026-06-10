import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
	...vi.importActual("react"),
	cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Contacts: { findMany: vi.fn() },
	},
}));

import { getContacts } from "@/actions/crm/get-contacts";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
	(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
		id,
		role,
	});
};

describe("getContacts scope", () => {
	beforeEach(() => vi.clearAllMocks());

	it("unauthenticated returns [] and does not query", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await getContacts();
		expect(res).toEqual([]);
		expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
	});

	it("user role: where includes deletedAt:null and OR with assigned/created/linked-account", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);
		await getContacts();
		const call = (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		expect(call.where.deletedAt).toBeNull();
		expect(call.where.OR).toEqual([
			{ assigned_to: "u1" },
			{ createdBy: "u1" },
			{
				assigned_accounts: {
					OR: [
						{ assigned_to: "u1" },
						{ createdBy: "u1" },
						{ watchers: { some: { user_id: "u1" } } },
					],
				},
			},
		]);
	});

	it("user role: returns contact rows from findMany", async () => {
		mockUser("user", "u1");
		const rows = [{ id: "c1" }];
		(
			prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>
		).mockResolvedValue(rows);
		const res = await getContacts();
		expect(res).toEqual(rows);
	});

	it("manager: where = { deletedAt: null } (no OR)", async () => {
		mockUser("manager", "m1");
		(
			prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);
		await getContacts();
		const call = (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		expect(call.where).toEqual({ deletedAt: null });
		expect(call.where.OR).toBeUndefined();
	});
});
