import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Opportunities: { update: vi.fn() },
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
	writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { deleteOpportunity } from "@/actions/crm/opportunities/delete-opportunity";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("deleteOpportunity", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser();
	});

	it("unauthenticated returns Unauthorized error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await deleteOpportunity("o1");
		expect(res).toEqual({ error: "Unauthorized" });
		expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
	});

	it("returns error when opportunityId is missing", async () => {
		mockUser();
		const res = await deleteOpportunity("");
		expect(res).toEqual({ error: "opportunityId is required" });
	});

	it("soft deletes opportunity by setting deletedAt and deletedBy", async () => {
		(
			prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "o1" });
		await deleteOpportunity("o1");
		expect(prismadb.crm_Opportunities.update).toHaveBeenCalledWith({
			where: { id: "o1" },
			data: expect.objectContaining({
				deletedAt: expect.any(Date),
				deletedBy: "u1",
			}),
		});
	});

	it("writes audit log with action 'deleted'", async () => {
		(
			prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "o1" });
		await deleteOpportunity("o1");
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "opportunity",
			entityId: "o1",
			action: "deleted",
			changes: null,
			userId: "u1",
		});
	});

	it("revalidates opportunities path on success", async () => {
		const { revalidatePath } = await import("next/cache");
		(
			prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "o1" });
		await deleteOpportunity("o1");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/crm/opportunities",
			"page",
		);
	});

	it("returns { success: true } on success", async () => {
		(
			prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "o1" });
		const res = await deleteOpportunity("o1");
		expect(res).toEqual({ success: true });
	});

	it("returns error on prisma failure", async () => {
		(
			prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("DB error"));
		const res = await deleteOpportunity("o1");
		expect(res).toEqual({ error: "Failed to delete opportunity" });
	});
});
