import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Contacts: { findFirst: vi.fn() },
		crm_Opportunities: { findMany: vi.fn() },
	},
}));

import { getOpportunitiesFullByContactId } from "@/actions/crm/get-opportunities-with-includes-by-contactId";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
	(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
		id,
		role,
	});
};

describe("getOpportunitiesFullByContactId scope", () => {
	beforeEach(() => vi.clearAllMocks());

	it("unauthenticated returns [] and does not query", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await getOpportunitiesFullByContactId("c1");
		expect(res).toEqual([]);
		expect(prismadb.crm_Contacts.findFirst).not.toHaveBeenCalled();
		expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
	});

	it("returns [] when assertCanReadContact misses (out-of-scope user)", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Contacts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);
		const res = await getOpportunitiesFullByContactId("c1");
		expect(res).toEqual([]);
		expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
	});

	it("user with contact access: scopes opportunities by contacts-junction + opportunityReadScopeWhere", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Contacts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>
		).mockResolvedValue([{ id: "o1" }]);
		const res = await getOpportunitiesFullByContactId("c1");
		expect(res).toEqual([{ id: "o1" }]);
		const call = (
			prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		expect(call.where.deletedAt).toBeNull();
		expect(call.where.contacts).toEqual({
			some: { contact_id: "c1" },
		});
		expect(Array.isArray(call.where.OR)).toBe(true);
		expect(call.where.OR).toEqual(
			expect.arrayContaining([{ assigned_to: "u1" }, { createdBy: "u1" }]),
		);
	});

	it("manager: where keeps junction filter and deletedAt:null (no OR)", async () => {
		mockUser("manager", "m1");
		(
			prismadb.crm_Contacts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);
		await getOpportunitiesFullByContactId("c1");
		const call = (
			prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		expect(call.where).toEqual({
			deletedAt: null,
			contacts: { some: { contact_id: "c1" } },
		});
		expect(call.where.OR).toBeUndefined();
	});
});
