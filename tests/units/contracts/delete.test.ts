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

vi.mock("@/lib/audit-log", () => ({
	writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/create-safe-action", () => ({
	createSafeAction: vi.fn((_schema, handler) => {
		return (data: any) => handler(data);
	}),
}));

import { deleteContract } from "@/actions/crm/contracts/delete-contract";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockSessionUser = (email = "user@test.com", id = "u1") => {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
		user: { email, id },
	});
};

describe("deleteContract", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSessionUser();
		(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "u1",
		});
	});

	it("unauthenticated returns error via session", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const res = await deleteContract({ id: "c1" });
		expect(res).toEqual({ error: "User not logged in." });
	});

	it("user not found returns error", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
			user: { email: "user@test.com", id: "u1" },
		});
		(prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);
		const res = await deleteContract({ id: "c1" });
		expect(res).toEqual({ error: "User not found." });
	});

	it("missing id returns error", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({});
		const res = await deleteContract({ id: "" } as any);
		expect(res).toEqual({ error: "Please fill in all the required fields." });
	});

	it("soft deletes contract by setting deletedAt and deletedBy", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await deleteContract({ id: "c1" });
		expect(prismadb.crm_Contracts.update).toHaveBeenCalledWith({
			where: { id: "c1" },
			data: expect.objectContaining({
				deletedAt: expect.any(Date),
				deletedBy: "u1",
			}),
		});
	});

	it("writes audit log with action 'deleted'", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		await deleteContract({ id: "c1" });
		expect(writeAuditLog).toHaveBeenCalledWith({
			entityType: "contract",
			entityId: "c1",
			action: "deleted",
			changes: null,
			userId: "u1",
		});
	});

	it("returns { data: { id } } on success", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "c1" });
		const res = await deleteContract({ id: "c1" });
		expect(res).toEqual({ data: { id: "c1" } });
	});

	it("returns error on prisma failure", async () => {
		(
			prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("DB error"));
		const res = await deleteContract({ id: "c1" });
		expect(res).toEqual({
			error:
				"Something went wrong while trying to run DeleteContract action. Please try again.",
		});
	});
});
