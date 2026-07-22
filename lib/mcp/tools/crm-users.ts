import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
} from "../helpers";

// Field exposure mirrors the web UI:
//   - actions/user/search-users.ts gives every authenticated user id/name/avatar
//     for ACTIVE users (this is the assignee picker), so members get the same.
//   - The wider set (email, role, status) is admin-module territory, so it is
//     gated to manager/admin here.
const BASE_SELECT = { id: true, name: true, avatar: true } as const;
const PRIVILEGED_SELECT = {
  ...BASE_SELECT,
  email: true,
  role: true,
  userStatus: true,
  lastLoginAt: true,
} as const;

export const crmUserTools = [
  {
    name: "crm_list_users",
    description:
      "List NextCRM users, to resolve a person to the user ID needed by assigned_to. " +
      "Returns active users by default. Managers and admins additionally see email, " +
      "role, status and last login.",
    schema: z.object({
      // Substring match on name, same as the web UI's assignee picker.
      query: z.string().min(1).optional(),
      // Manager/admin only: inactive and pending users are hidden otherwise.
      status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "ALL"]).optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { query?: string; status?: string; limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      const privileged = user.role === "admin" || user.role === "manager";

      // Members never see anything but active users, whatever they ask for.
      const status = privileged ? (args.status ?? "ACTIVE") : "ACTIVE";

      const where = {
        ...(status !== "ALL" && { userStatus: status as "ACTIVE" | "INACTIVE" | "PENDING" }),
        ...(args.query && {
          name: { contains: args.query, mode: "insensitive" as const },
        }),
      };

      const [data, total] = await Promise.all([
        prismadb.users.findMany({
          where,
          select: privileged ? PRIVILEGED_SELECT : BASE_SELECT,
          ...paginationArgs(args),
          orderBy: { name: "asc" },
        }),
        prismadb.users.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
];
