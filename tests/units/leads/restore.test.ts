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

import { restoreLead } from "@/actions/crm/leads/restore-lead";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin" = "admin", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
		user: { id, role },
	});
};

describe("restoreLead", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser("admin");
	});

	it("unauthenticated returns Unauthorized error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await restoreLead("l1");
		expect(res).toEqual({ error: "Unauthorized" });
		expect(prismadb.crm_Leads.update).not.toHaveBeenCalled();
	});

	it("non-admin returns Forbidden error", async () => {
		mockUser("user");
		const res = await restoreLead("l1");
		expect(res).toEqual({ error: "Forbidden" });
		expect(prismadb.crm_Leads.update).not.toHaveBeenCalled();
	});

	it("manager returns Forbidden error", async () => {
		mockUser("manager");
		const res = await restoreLead("l1");
		expect(res).toEqual({ error: "Forbidden" });
		expect(prismadb.crm_Leads.update).not.toHaveBeenCalled();
	});

	it("returns error when leadId is missing", async () => {
		mockUser("admin");
		const res = await restoreLead("");
		expect(res).toEqual({ error: "leadId is required" });
	});

	it("restores lead by clearing deletedAt and deletedBy", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await restoreLead("l1");
		expect(prismadb.crm_Leads.update).toHaveBeenCalledWith({
			where: { id: "l1" },
			data: {
				deletedAt: null,
				deletedBy: null,
			},
		});
	});

	it("writes audit log with action 'restored'", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await restoreLead("l1");
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "lead",
			entityId: "l1",
			action: "restored",
			changes: null,
			userId: "u1",
		});
	});

	it("revalidates leads and audit-log paths on success", async () => {
		const { revalidatePath } = await import("next/cache");
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await restoreLead("l1");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/crm/leads",
			"page",
		);
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/admin/audit-log",
			"page",
		);
	});

	it("returns { success: true } on success", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		const res = await restoreLead("l1");
		expect(res).toEqual({ success: true });
	});

	it("returns error on prisma failure", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("DB error"),
		);
		const res = await restoreLead("l1");
		expect(res).toEqual({ error: "Failed to restore lead" });
	});
});
