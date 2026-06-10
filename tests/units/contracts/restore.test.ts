import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Contracts: { update: vi.fn() },
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
	writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { restoreContract } from "@/actions/crm/contracts/restore-contract";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin" = "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
		user: { id, role },
	});
};

describe("restoreContract", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser("admin");
	});

	it("unauthenticated returns Unauthorized error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await restoreContract("c1");
		expect(res).toEqual({ error: "Unauthorized" });
		expect(prismadb.crm_Contracts.update).not.toHaveBeenCalled();
	});

	it("non-admin returns Forbidden error", async () => {
		mockUser("user");
		const res = await restoreContract("c1");
		expect(res).toEqual({ error: "Forbidden" });
		expect(prismadb.crm_Contracts.update).not.toHaveBeenCalled();
	});

	it("manager returns Forbidden error", async () => {
		mockUser("manager");
		const res = await restoreContract("c1");
		expect(res).toEqual({ error: "Forbidden" });
		expect(prismadb.crm_Contracts.update).not.toHaveBeenCalled();
	});

	it("returns error when contractId is missing", async () => {
		mockUser("admin");
		const res = await restoreContract("");
		expect(res).toEqual({ error: "contractId is required" });
	});

	it("restores contract by clearing deletedAt and deletedBy", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await restoreContract("c1");
		expect(prismadb.crm_Contracts.update).toHaveBeenCalledWith({
			where: { id: "c1" },
			data: {
				deletedAt: null,
				deletedBy: null,
			},
		});
	});

	it("writes audit log with action 'restored'", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await restoreContract("c1");
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "contract",
			entityId: "c1",
			action: "restored",
			changes: null,
			userId: "u1",
		});
	});

	it("revalidates contracts and audit-log paths on success", async () => {
		const { revalidatePath } = await import("next/cache");
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await restoreContract("c1");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/crm/contracts",
			"page",
		);
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/admin/audit-log",
			"page",
		);
	});

	it("returns { success: true } on success", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		const res = await restoreContract("c1");
		expect(res).toEqual({ success: true });
	});

	it("returns error on prisma failure", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("DB error"));
		const res = await restoreContract("c1");
		expect(res).toEqual({ error: "Failed to restore contract" });
	});
});
