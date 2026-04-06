import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  softDeleteData,
} from "../helpers";

export const crmTargetListTools = [
  {
    name: "crm_list_target_lists",
    description: "List target lists (org-wide)",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, _userId: string) {
      const where = { deletedAt: null };
      const [data, total] = await Promise.all([
        prismadb.crm_TargetLists.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
          include: { _count: { select: { targets: true } } },
        }),
        prismadb.crm_TargetLists.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_target_list",
    description: "Get a target list by ID with its members",
    schema: z.object({
      id: z.string().uuid(),
      ...paginationSchema,
    }),
    async handler(
      args: { id: string; limit: number; offset: number },
      _userId: string
    ) {
      const tl = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, status: true },
        include: {
          targets: {
            ...paginationArgs(args),
            include: { target: true },
          },
          _count: { select: { targets: true } },
        },
      });
      if (!tl) notFound("TargetList");
      return itemResponse(tl);
    },
  },
  {
    name: "crm_create_target_list",
    description: "Create a new target list",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }),
    async handler(args: { name: string; description?: string }, userId: string) {
      const tl = await prismadb.crm_TargetLists.create({
        data: { name: args.name, description: args.description, created_by: userId },
      });
      return itemResponse(tl);
    },
  },
  {
    name: "crm_update_target_list",
    description: "Update a target list by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    }),
    async handler(
      args: { id: string; name?: string; description?: string },
      _userId: string
    ) {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, status: true },
      });
      if (!existing) notFound("TargetList");
      const { id, ...updateData } = args;
      const tl = await prismadb.crm_TargetLists.update({
        where: { id },
        data: updateData,
      });
      return itemResponse(tl);
    },
  },
  {
    name: "crm_delete_target_list",
    description: "Soft-delete a target list (sets status to false)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, status: true },
      });
      if (!existing) notFound("TargetList");
      const tl = await prismadb.crm_TargetLists.update({
        where: { id: args.id },
        data: softDeleteData(_userId),
      });
      return itemResponse({ id: tl.id, deletedAt: tl.deletedAt });
    },
  },
  {
    name: "crm_add_to_target_list",
    description: "Add one or more targets to a target list",
    schema: z.object({
      target_list_id: z.string().uuid(),
      target_ids: z.array(z.string().uuid()).min(1).max(100),
    }),
    async handler(
      args: { target_list_id: string; target_ids: string[] },
      _userId: string
    ) {
      const tl = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.target_list_id, status: true },
      });
      if (!tl) notFound("TargetList");
      await prismadb.targetsToTargetLists.createMany({
        data: args.target_ids.map((tid) => ({
          target_id: tid,
          target_list_id: args.target_list_id,
        })),
        skipDuplicates: true,
      });
      return itemResponse({
        target_list_id: args.target_list_id,
        added: args.target_ids.length,
      });
    },
  },
  {
    name: "crm_remove_from_target_list",
    description: "Remove one or more targets from a target list",
    schema: z.object({
      target_list_id: z.string().uuid(),
      target_ids: z.array(z.string().uuid()).min(1).max(100),
    }),
    async handler(
      args: { target_list_id: string; target_ids: string[] },
      _userId: string
    ) {
      await prismadb.targetsToTargetLists.deleteMany({
        where: {
          target_list_id: args.target_list_id,
          target_id: { in: args.target_ids },
        },
      });
      return itemResponse({
        target_list_id: args.target_list_id,
        removed: args.target_ids.length,
      });
    },
  },
];
