import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Leads: { update: vi.fn() },
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
	writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { deleteLead } from "@/actions/crm/leads/delete-lead";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("deleteLead", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser();
	});

	it("unauthenticated returns Unauthorized error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await deleteLead("l1");
		expect(res).toEqual({ error: "Unauthorized" });
		expect(prismadb.crm_Leads.update).not.toHaveBeenCalled();
	});

	it("returns error when leadId is missing", async () => {
		mockUser();
		const res = await deleteLead("");
		expect(res).toEqual({ error: "leadId is required" });
	});

	it("soft deletes lead by setting deletedAt and deletedBy", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await deleteLead("l1");
		expect(prismadb.crm_Leads.update).toHaveBeenCalledWith({
			where: { id: "l1" },
			data: expect.objectContaining({
				deletedAt: expect.any(Date),
				deletedBy: "u1",
			}),
		});
	});

	it("writes audit log with action 'deleted'", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await deleteLead("l1");
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "lead",
			entityId: "l1",
			action: "deleted",
			changes: null,
			userId: "u1",
		});
	});

	it("revalidates leads path on success", async () => {
		const { revalidatePath } = await import("next/cache");
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await deleteLead("l1");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/crm/leads",
			"page",
		);
	});

	it("returns { success: true } on success", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		const res = await deleteLead("l1");
		expect(res).toEqual({ success: true });
	});

	it("returns error on prisma failure", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("DB error"),
		);
		const res = await deleteLead("l1");
		expect(res).toEqual({ error: "Failed to delete lead" });
	});
});
