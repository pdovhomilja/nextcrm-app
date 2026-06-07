import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_TargetLists: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    targetsToTargetLists: {
      createMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { addTargetsToList } from "@/actions/crm/target-lists/add-targets-to-list";
import { createTargetList } from "@/actions/crm/target-lists/create-target-list";
import { deleteTargetList } from "@/actions/crm/target-lists/delete-target-list";
import { removeTargetFromList } from "@/actions/crm/target-lists/remove-target-from-list";
import { updateTargetList } from "@/actions/crm/target-lists/update-target-list";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createTargetList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createTargetList({ name: "List" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing name returns error", async () => {
    const res = await createTargetList({ name: "" });
    expect(res).toEqual({ error: "name is required" });
  });

  it("creates list with targets", async () => {
    (prismadb.crm_TargetLists.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tl1", name: "List" });
    const res = await createTargetList({
      name: "List",
      description: "Desc",
      targetIds: ["t1", "t2"],
    });
    expect(res).toEqual({ data: { id: "tl1", name: "List" } });
  });
});

describe("deleteTargetList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await deleteTargetList("tl1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing id returns error", async () => {
    const res = await deleteTargetList("");
    expect(res).toEqual({ error: "targetListId is required" });
  });

  it("soft deletes list", async () => {
    (prismadb.crm_TargetLists.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tl1" });
    const res = await deleteTargetList("tl1");
    expect(res).toEqual({ success: true });
  });
});

describe("updateTargetList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateTargetList({ id: "tl1", name: "Updated" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing id returns error", async () => {
    const res = await updateTargetList({ id: "" });
    expect(res).toEqual({ error: "id is required" });
  });

  it("returns error when list not found", async () => {
    (prismadb.crm_TargetLists.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateTargetList({ id: "tl1", name: "Updated" });
    expect(res).toEqual({ error: "Target list not found" });
  });

  it("updates list successfully", async () => {
    (prismadb.crm_TargetLists.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tl1" });
    (prismadb.crm_TargetLists.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "tl1", name: "Updated" });
    const res = await updateTargetList({ id: "tl1", name: "Updated" });
    expect(res).toEqual({ data: { id: "tl1", name: "Updated" } });
  });
});

describe("addTargetsToList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await addTargetsToList("tl1", ["t1"]);
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("empty array returns error", async () => {
    const res = await addTargetsToList("tl1", []);
    expect(res).toEqual({ error: "targetIds must be a non-empty array" });
  });

  it("adds targets successfully", async () => {
    (prismadb.targetsToTargetLists.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
    const res = await addTargetsToList("tl1", ["t1", "t2"]);
    expect(res).toEqual({ added: 2 });
  });
});

describe("removeTargetFromList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await removeTargetFromList("tl1", "t1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing targetId returns error", async () => {
    const res = await removeTargetFromList("tl1", "");
    expect(res).toEqual({ error: "targetId is required" });
  });

  it("removes target successfully", async () => {
    (prismadb.targetsToTargetLists.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await removeTargetFromList("tl1", "t1");
    expect(res).toEqual({ success: true });
  });
});
