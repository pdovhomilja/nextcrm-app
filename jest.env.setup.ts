import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

// Most tests mock "@/lib/prisma" without the permission tables; with no stored
// rules every user resolves to the built-in role defaults.
jest.mock("@/lib/authz/permission-store", () => ({
  loadPermissionRows: jest.fn(async () => ({
    roleOverrides: [],
    groupEntries: [],
    userEntries: [],
  })),
}));
