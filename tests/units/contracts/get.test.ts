import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Contracts: { findFirst: vi.fn(), findUnique: vi.fn() },
	},
}));

import { getContract } from "@/actions/crm/get-contract";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
	(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
		id,
		role,
	});
};

describe("getContract scope", () => {
	beforeEach(() => vi.clearAllMocks());

	it("unauthenticated returns null and does not query contract", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await getContract("c1");
		expect(res).toBeNull();
		expect(prismadb.crm_Contracts.findFirst).not.toHaveBeenCalled();
		expect(prismadb.crm_Contracts.findUnique).not.toHaveBeenCalled();
	});

	it("user out-of-scope returns null (assert miss)", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Contracts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);
		const res = await getContract("c1");
		expect(res).toBeNull();
		expect(prismadb.crm_Contracts.findFirst).toHaveBeenCalledTimes(1);
		expect(prismadb.crm_Contracts.findUnique).not.toHaveBeenCalled();
	});

	it("user in-scope returns contract detail", async () => {
		mockUser("user", "u1");
		(
			prismadb.crm_Contracts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1", title: "X" });
		const res = await getContract("c1");
		expect(res).toEqual({ id: "c1", title: "X" });
		expect(prismadb.crm_Contracts.findUnique).toHaveBeenCalledTimes(1);
	});

	it("manager returns contract detail (no OR in assert where)", async () => {
		mockUser("manager", "m1");
		(
			prismadb.crm_Contracts.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1", title: "X" });
		const res = await getContract("c1");
		expect(res).toEqual({ id: "c1", title: "X" });
		const assertCall = (
			prismadb.crm_Contracts.findFirst as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		expect(assertCall.where.OR).toBeUndefined();
	});
});
