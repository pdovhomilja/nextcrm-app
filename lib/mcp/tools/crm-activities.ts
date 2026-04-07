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

const entityLinkSchema = z.object({
  entityType: z.enum(["account", "contact", "lead", "opportunity", "contract"]),
  entityId: z.string().uuid(),
});

export const crmActivityTools = [
  {
    name: "crm_list_activities",
    description:
      "List CRM activities created by the authenticated user, optionally filtered by linked entity",
    schema: z.object({
      type: z.enum(["call", "meeting", "note", "email"]).optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      ...paginationSchema,
    }),
    async handler(
      args: {
        type?: string;
        status?: string;
        entityType?: string;
        entityId?: string;
        limit: number;
        offset: number;
      },
      userId: string
    ) {
      const where: any = {
        createdBy: userId,
        deletedAt: null,
        ...(args.type && { type: args.type as any }),
        ...(args.status && { status: args.status as any }),
        ...(args.entityType &&
          args.entityId && {
            links: {
              some: { entityType: args.entityType, entityId: args.entityId },
            },
          }),
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Activities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { date: "desc" },
          include: { links: true },
        }),
        prismadb.crm_Activities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_activity",
    description: "Get a single CRM activity by ID with entity links",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const activity = await prismadb.crm_Activities.findFirst({
        where: { id: args.id, createdBy: userId, deletedAt: null },
        include: { links: true },
      });
      if (!activity) notFound("Activity");
      return itemResponse(activity);
    },
  },
  {
    name: "crm_create_activity",
    description: "Create a CRM activity (call/meeting/note/email) and link to entities",
    schema: z.object({
      type: z.enum(["call", "meeting", "note", "email"]),
      title: z.string().min(1),
      description: z.string().optional(),
      date: z.string().datetime(),
      duration: z.number().int().min(0).optional(),
      outcome: z.string().optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
      links: z.array(entityLinkSchema).optional(),
    }),
    async handler(
      args: {
        type: string;
        title: string;
        description?: string;
        date: string;
        duration?: number;
        outcome?: string;
        status: string;
        links?: Array<{ entityType: string; entityId: string }>;
      },
      userId: string
    ) {
      const { links, date, ...rest } = args;
      const activity = await prismadb.crm_Activities.create({
        data: {
          ...rest,
          type: rest.type as any,
          status: rest.status as any,
          date: new Date(date),
          createdBy: userId,
          updatedBy: userId,
          ...(links?.length && {
            links: {
              createMany: {
                data: links.map((l) => ({
                  entityType: l.entityType,
                  entityId: l.entityId,
                })),
              },
            },
          }),
        },
        include: { links: true },
      });
      return itemResponse(activity);
    },
  },
  {
    name: "crm_update_activity",
    description: "Update an existing CRM activity by ID",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      date: z.string().datetime().optional(),
      duration: z.number().int().min(0).optional(),
      outcome: z.string().optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
    }),
    async handler(
      args: {
        id: string;
        title?: string;
        description?: string;
        date?: string;
        duration?: number;
        outcome?: string;
        status?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Activities.findFirst({
        where: { id: args.id, createdBy: userId, deletedAt: null },
      });
      if (!existing) notFound("Activity");
      const { id, date, status, ...rest } = args;
      const activity = await prismadb.crm_Activities.update({
        where: { id },
        data: {
          ...rest,
          ...(date !== undefined && { date: new Date(date) }),
          ...(status !== undefined && { status: status as any }),
          updatedBy: userId,
        },
      });
      return itemResponse(activity);
    },
  },
  {
    name: "crm_delete_activity",
    description: "Soft-delete a CRM activity by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Activities.findFirst({
        where: { id: args.id, createdBy: userId, deletedAt: null },
      });
      if (!existing) notFound("Activity");
      const activity = await prismadb.crm_Activities.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: activity.id, deletedAt: activity.deletedAt });
    },
  },
];
