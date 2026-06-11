import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Accounts: { findFirst: vi.fn() },
		crm_Leads: { findMany: vi.fn() },
	},
}));

import { getLeadsByAccountId } from "@/actions/crm/get-leads-by-accountId";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
	(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
		id,
		role,
	});
};

describe("getLeadsByAccountId scope", () => {
	beforeEach(() => vi.clearAllMocks());

	it("unauthenticated returns [] and does not query", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await getLeadsByAccountId("a1");
		expect(res).toEqual([]);
		expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
		expect(prismadb.crm_Leads.findMany).not.toHaveBeenCalled();
	});

	it("returns [] when assertCanReadAccount misses (out-of-scope user)", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);
		const res = await getLeadsByAccountId("a1");
		expect(res).toEqual([]);
		expect(prismadb.crm_Leads.findMany).not.toHaveBeenCalled();
	});

	it("user with account access: scopes leads by accountsIDs + leadReadScopeWhere", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "a1" });
		(prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
			[{ id: "l1" }],
		);
		const res = await getLeadsByAccountId("a1");
		expect(res).toEqual([{ id: "l1" }]);
		const call = (prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(call.where.accountsIDs).toBe("a1");
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

	it("manager: where = { accountsIDs, deletedAt:null } (no OR)", async () => {
		mockUser("manager", "m1");
		(
			prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "a1" });
		(prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
			[],
		);
		await getLeadsByAccountId("a1");
		const call = (prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(call.where).toEqual({ accountsIDs: "a1", deletedAt: null });
		expect(call.where.OR).toBeUndefined();
	});
});
