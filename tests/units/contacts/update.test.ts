import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
	prismadb: {
		users: { findUnique: vi.fn() },
		crm_Contacts: { findUnique: vi.fn(), update: vi.fn() },
	},
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

import { updateContact } from "@/actions/crm/contacts/update-contact";
import { inngest } from "@/inngest/client";
import { diffObjects, writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("updateContact", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUser();
	});

	it("unauthenticated returns Unauthorized error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await updateContact({ id: "c1", last_name: "Doe" });
		expect(res).toEqual({ error: "Unauthorized" });
		expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled();
	});

	it("returns error when id is missing", async () => {
		mockUser();
		const res = await updateContact({ last_name: "Doe" } as any);
		expect(res).toEqual({ error: "id is required" });
	});

	it("fetches before state via findUnique with deletedAt:null", async () => {
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1", lastName: "Doe" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1", lastName: "Smith" });
		await updateContact({ id: "c1", last_name: "Smith" });
		expect(prismadb.crm_Contacts.findUnique).toHaveBeenCalledWith({
			where: { id: "c1", deletedAt: null },
		});
	});

	it("updates contact with correct fields", async () => {
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1", lastName: "Smith" });
		const res = await updateContact({ id: "c1", last_name: "Smith" });
		expect(res).toEqual({ data: { id: "c1", lastName: "Smith" } });
		expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith({
			where: { id: "c1" },
			data: expect.objectContaining({
				v: 0,
				updatedBy: "u1",
				last_name: "Smith",
			}),
		});
	});

	it("maps birthday_day/month/year to birthday field", async () => {
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await updateContact({
			id: "c1",
			last_name: "Doe",
			birthday_day: "15",
			birthday_month: "06",
			birthday_year: "1990",
		});
		const call = (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(call.data.birthday).toBe("15/06/1990");
	});

	it("sets birthday to null when any birthday field is missing", async () => {
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await updateContact({
			id: "c1",
			last_name: "Doe",
			birthday_day: "15",
			birthday_month: "06",
		});
		const call = (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(call.data.birthday).toBeNull();
	});

	it("calls diffObjects with before and after state", async () => {
		const before = { id: "c1", lastName: "Doe" };
		const after = { id: "c1", lastName: "Smith" };
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue(before);
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue(after);
		await updateContact({ id: "c1", last_name: "Smith" });
		expect(diffObjects).toHaveBeenCalledWith(before, after);
	});

	it("writes audit log with changes on success", async () => {
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await updateContact({ id: "c1", last_name: "Smith" });
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "contact",
			entityId: "c1",
			action: "updated",
			changes: { lastName: ["Doe", "Smith"] },
			userId: "u1",
		});
	});

	it("sends inngest event on success", async () => {
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await updateContact({ id: "c1", last_name: "Smith" });
		expect(inngest.send).toHaveBeenCalledWith({
			name: "crm/contact.saved",
			data: { record_id: "c1" },
		});
	});

	it("revalidates contacts path on success", async () => {
		const { revalidatePath } = await import("next/cache");
		(
			prismadb.crm_Contacts.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await updateContact({ id: "c1", last_name: "Smith" });
		expect(revalidatePath).toHaveBeenCalledWith(
			"/[locale]/(routes)/crm/contacts",
			"page",
		);
	});

	it("returns error on prisma failure", async () => {
		(
			prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("DB error"));
		const res = await updateContact({ id: "c1", last_name: "Doe" });
		expect(res).toEqual({ error: "Failed to update contact" });
	});
});
