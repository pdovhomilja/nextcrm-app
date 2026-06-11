import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn(), findFirst: vi.fn() },
		crm_Leads: { findUnique: vi.fn(), update: vi.fn() },
	},
}));

vi.mock("@/lib/sendmail", () => ({
	default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/inngest/client", () => ({
	inngest: { send: vi.fn().mockResolvedValue({}) },
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
	writeAuditLog: vi.fn().mockResolvedValue(undefined),
	diffObjects: vi.fn().mockReturnValue({ lastName: ["Doe", "Smith"] }),
}));

import { updateLead } from "@/actions/crm/leads/update-lead";
import { inngest } from "@/inngest/client";
import { diffObjects, writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("updateLead", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser();
	});

	it("unauthenticated returns Unauthorized error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await updateLead({ id: "l1", lastName: "Doe" });
		expect(res).toEqual({ error: "Unauthorized" });
		expect(prismadb.crm_Leads.update).not.toHaveBeenCalled();
	});

	it("returns error when id is missing", async () => {
		mockUser();
		const res = await updateLead({ lastName: "Doe" } as any);
		expect(res).toEqual({ error: "id is required" });
	});

	it("fetches before state via findUnique with deletedAt:null", async () => {
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "l1", lastName: "Doe" });
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
			lastName: "Smith",
		});
		await updateLead({ id: "l1", lastName: "Smith" });
		expect(prismadb.crm_Leads.findUnique).toHaveBeenCalledWith({
			where: { id: "l1", deletedAt: null },
		});
	});

	it("updates lead with correct fields", async () => {
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "l1" });
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
			lastName: "Smith",
		});
		const res = await updateLead({ id: "l1", lastName: "Smith" });
		expect(res).toEqual({ data: { id: "l1", lastName: "Smith" } });
		expect(prismadb.crm_Leads.update).toHaveBeenCalledWith({
			where: { id: "l1" },
			data: expect.objectContaining({
				v: 1,
				updatedBy: "u1",
				lastName: "Smith",
			}),
		});
	});

	it("sets assigned_to to userId when assigned_to not provided", async () => {
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "l1" });
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await updateLead({ id: "l1", lastName: "Smith" });
		const call = (prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(call.data.assigned_to).toBe("u1");
	});

	it("calls diffObjects with before and after state", async () => {
		const before = { id: "l1", lastName: "Doe" };
		const after = { id: "l1", lastName: "Smith" };
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue(before);
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue(
			after,
		);
		await updateLead({ id: "l1", lastName: "Smith" });
		expect(diffObjects).toHaveBeenCalledWith(before, after);
	});

	it("writes audit log with changes on success", async () => {
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "l1" });
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await updateLead({ id: "l1", lastName: "Smith" });
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "lead",
			entityId: "l1",
			action: "updated",
			changes: { lastName: ["Doe", "Smith"] },
			userId: "u1",
		});
	});

	it("sends inngest event on success", async () => {
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "l1" });
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await updateLead({ id: "l1", lastName: "Smith" });
		expect(inngest.send).toHaveBeenCalledWith({
			name: "crm/lead.saved",
			data: { record_id: "l1" },
		});
	});

	it("revalidates leads path on success", async () => {
		const { revalidatePath } = await import("next/cache");
		(
			prismadb.crm_Leads.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "l1" });
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "l1",
		});
		await updateLead({ id: "l1", lastName: "Smith" });
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/crm/leads",
			"page",
		);
	});

	it("returns error on prisma failure", async () => {
		(prismadb.crm_Leads.update as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("DB error"),
		);
		const res = await updateLead({ id: "l1", lastName: "Doe" });
		expect(res).toEqual({ error: "Failed to update lead" });
	});
});
