import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Leads: { findFirst: vi.fn() },
	},
}));

import { getLead } from "@/actions/crm/get-lead";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
	(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
		id,
		role,
	});
};

describe("getLead scope", () => {
	beforeEach(() => vi.clearAllMocks());

	it("unauthenticated returns null and does not query lead", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await getLead("l1");
		expect(res).toBeNull();
		expect(prismadb.crm_Leads.findFirst).not.toHaveBeenCalled();
	});

	it("user out-of-scope returns null (assert miss)", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Leads.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);
		const res = await getLead("l1");
		expect(res).toBeNull();
		expect(prismadb.crm_Leads.findFirst).toHaveBeenCalledTimes(1);
	});

	it("owner returns lead detail", async () => {
		mockUser("user", "u1");
		(prismadb.crm_Leads.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ id: "l1" })
			.mockResolvedValueOnce({ id: "l1", firstName: "Alice" });
		const res = await getLead("l1");
		expect(res).toEqual({ id: "l1", firstName: "Alice" });
		expect(prismadb.crm_Leads.findFirst).toHaveBeenCalledTimes(2);
	});

	it("manager returns lead detail (no OR in assert where)", async () => {
		mockUser("manager", "m1");
		(prismadb.crm_Leads.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ id: "l1" })
			.mockResolvedValueOnce({ id: "l1", firstName: "Alice" });
		const res = await getLead("l1");
		expect(res).toEqual({ id: "l1", firstName: "Alice" });
		const assertCall = (
			prismadb.crm_Leads.findFirst as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		expect(assertCall.where.OR).toBeUndefined();
	});
});
