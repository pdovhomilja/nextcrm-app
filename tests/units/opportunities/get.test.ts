import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Opportunities: { findFirst: vi.fn() },
	},
}));

import { getOpportunity } from "@/actions/crm/get-opportunity";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
	(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
		id,
		role,
	});
};

describe("getOpportunity scope", () => {
	beforeEach(() => vi.clearAllMocks());

	it("unauthenticated returns null and does not query", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await getOpportunity("o1");
		expect(res).toBeNull();
		expect(prismadb.crm_Opportunities.findFirst).not.toHaveBeenCalled();
	});

	it("user out-of-scope returns null (assert miss)", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);
		const res = await getOpportunity("o1");
		expect(res).toBeNull();
		expect(prismadb.crm_Opportunities.findFirst).toHaveBeenCalledTimes(1);
	});

	it("owner returns opportunity detail", async () => {
		mockUser("user", "u1");
		(prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ id: "o1" })
			.mockResolvedValueOnce({ id: "o1", name: "Big Deal" });
		const res = await getOpportunity("o1");
		expect(res).toEqual({ id: "o1", name: "Big Deal" });
		expect(prismadb.crm_Opportunities.findFirst).toHaveBeenCalledTimes(2);
	});

	it("manager returns detail (assert where has no OR)", async () => {
		mockUser("manager", "m1");
		(prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ id: "o1" })
			.mockResolvedValueOnce({ id: "o1", name: "Big Deal" });
		const res = await getOpportunity("o1");
		expect(res).toEqual({ id: "o1", name: "Big Deal" });
		const assertCall = (
			prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		expect(assertCall.where.OR).toBeUndefined();
	});
});
