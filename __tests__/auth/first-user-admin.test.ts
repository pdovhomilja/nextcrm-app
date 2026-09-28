jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      count: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/new-user-notify", () => ({
  newUserNotify: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { newUserNotify } from "@/lib/new-user-notify";
import { handleUserCreated } from "@/lib/auth-hooks";

const usersCount = prismadb.users.count as jest.Mock;
const usersUpdate = prismadb.users.update as jest.Mock;
const usersFindUnique = prismadb.users.findUnique as jest.Mock;
const notify = newUserNotify as jest.Mock;

describe("handleUserCreated — first-user-admin promotion", () => {
  const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    // Non-demo instance so the notify branch is exercised for later users.
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  afterAll(() => {
    if (ORIGINAL_APP_URL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
    }
  });

  it("promotes the first user to an ACTIVE admin and does not notify", async () => {
    usersCount.mockResolvedValue(1);

    await handleUserCreated("user-1");

    expect(usersUpdate).toHaveBeenCalledTimes(1);
    expect(usersUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "admin", userStatus: "ACTIVE" },
    });
    expect(notify).not.toHaveBeenCalled();
    expect(usersFindUnique).not.toHaveBeenCalled();
  });

  it("notifies admins for a subsequent (non-demo) user and does not promote", async () => {
    usersCount.mockResolvedValue(2);
    const dbUser = { id: "user-2", name: "Second User", email: "second@example.com" };
    usersFindUnique.mockResolvedValue(dbUser);

    await handleUserCreated("user-2");

    // Not promoted to admin.
    expect(usersUpdate).not.toHaveBeenCalled();
    // Admins notified with the fetched user record.
    expect(usersFindUnique).toHaveBeenCalledWith({ where: { id: "user-2" } });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(dbUser);
  });

  it("does not notify on a demo instance for a subsequent user", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://demo.nextcrm.io";
    usersCount.mockResolvedValue(2);

    await handleUserCreated("user-2");

    expect(usersUpdate).not.toHaveBeenCalled();
    expect(usersFindUnique).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
