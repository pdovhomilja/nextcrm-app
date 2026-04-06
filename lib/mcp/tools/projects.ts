import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
} from "../helpers";

function userBoardWhere(userId: string) {
  return {
    OR: [
      { user: userId },
      { sharedWith: { has: userId } },
    ],
  };
}

export const projectTools = [
  // ── Boards ────────────────────────────────────────────
  {
    name: "projects_list_boards",
    description: "List project boards the user owns or is shared with",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = userBoardWhere(userId);
      const [data, total] = await Promise.all([
        prismadb.boards.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { sections: true } } },
        }),
        prismadb.boards.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "projects_get_board",
    description: "Get a project board with its sections and tasks",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const board = await prismadb.boards.findFirst({
        where: { id: args.id, ...userBoardWhere(userId) },
        include: {
          sections: {
            orderBy: { position: "asc" },
            include: {
              tasks: {
                orderBy: { position: "asc" },
                where: { taskStatus: { not: "COMPLETE" } },
              },
            },
          },
          watchers: true,
        },
      });
      if (!board) notFound("Board");
      return itemResponse(board);
    },
  },
  {
    name: "projects_create_board",
    description: "Create a new project board",
    schema: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      icon: z.string().optional(),
      visibility: z.string().optional(),
    }),
    async handler(
      args: { title: string; description: string; icon?: string; visibility?: string },
      userId: string
    ) {
      const board = await prismadb.boards.create({
        data: {
          v: 0,
          title: args.title,
          description: args.description,
          icon: args.icon,
          visibility: args.visibility,
          user: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return itemResponse(board);
    },
  },
  {
    name: "projects_update_board",
    description: "Update a project board by ID",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      visibility: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const existing = await prismadb.boards.findFirst({
        where: { id: args.id, ...userBoardWhere(userId) },
      });
      if (!existing) notFound("Board");
      const { id, ...updateData } = args;
      const board = await prismadb.boards.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(board);
    },
  },
  {
    name: "projects_delete_board",
    description: "Soft-delete a project board (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Boards. See docs/soft-delete-gaps.md");
    },
  },

  // ── Sections ──────────────────────────────────────────
  {
    name: "projects_create_section",
    description: "Add a section (column) to a board",
    schema: z.object({
      board: z.string().uuid(),
      title: z.string().min(1),
    }),
    async handler(args: { board: string; title: string }, userId: string) {
      const board = await prismadb.boards.findFirst({
        where: { id: args.board, ...userBoardWhere(userId) },
      });
      if (!board) notFound("Board");
      const maxPos = await prismadb.sections.aggregate({
        where: { board: args.board },
        _max: { position: true },
      });
      const section = await prismadb.sections.create({
        data: {
          v: 0,
          board: args.board,
          title: args.title,
          position: (maxPos._max.position ?? BigInt(0)) + BigInt(1000),
        },
      });
      return itemResponse(section);
    },
  },
  {
    name: "projects_update_section",
    description: "Update a section title or position",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      position: z.number().int().optional(),
    }),
    async handler(args: { id: string; title?: string; position?: number }, _userId: string) {
      const existing = await prismadb.sections.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Section");
      const { id, position, ...rest } = args;
      const section = await prismadb.sections.update({
        where: { id },
        data: { ...rest, ...(position !== undefined && { position: BigInt(position) }) },
      });
      return itemResponse(section);
    },
  },
  {
    name: "projects_delete_section",
    description: "Delete a section (must be empty — no tasks)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const section = await prismadb.sections.findUnique({
        where: { id: args.id },
        include: { _count: { select: { tasks: true } } },
      });
      if (!section) notFound("Section");
      if (section._count.tasks > 0) conflict("Cannot delete section with tasks. Move or delete tasks first.");
      await prismadb.sections.delete({ where: { id: args.id } });
      return itemResponse({ id: args.id, deleted: true });
    },
  },

  // ── Tasks ─────────────────────────────────────────────
  {
    name: "projects_list_tasks",
    description: "List tasks, optionally filtered by board, section, user, or status",
    schema: z.object({
      board: z.string().uuid().optional(),
      section: z.string().uuid().optional(),
      user: z.string().uuid().optional(),
      status: z.enum(["ACTIVE", "PENDING", "COMPLETE"]).optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { board?: string; section?: string; user?: string; status?: string; limit: number; offset: number },
      userId: string
    ) {
      const where: any = {
        ...(args.section && { section: args.section }),
        ...(args.user && { user: args.user }),
        ...(args.status && { taskStatus: args.status as any }),
      };
      if (args.board) {
        where.assigned_section = { board: args.board };
      }
      if (!args.board && !args.section) {
        // Default: tasks in user's boards
        where.assigned_section = { board_relation: userBoardWhere(userId) };
      }
      const [data, total] = await Promise.all([
        prismadb.tasks.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.tasks.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "projects_get_task",
    description: "Get a task by ID with comments and documents",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const task = await prismadb.tasks.findUnique({
        where: { id: args.id },
        include: {
          comments: { orderBy: { createdAt: "desc" }, take: 20 },
          documents: { include: { document: true } },
          assigned_section: { select: { id: true, title: true, board: true } },
        },
      });
      if (!task) notFound("Task");
      return itemResponse(task);
    },
  },
  {
    name: "projects_create_task",
    description: "Create a task in a board section",
    schema: z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      section: z.string().uuid(),
      priority: z.string().default("Normal"),
      dueDateAt: z.string().datetime().optional(),
    }),
    async handler(
      args: { title: string; content?: string; section: string; priority: string; dueDateAt?: string },
      userId: string
    ) {
      const sec = await prismadb.sections.findUnique({ where: { id: args.section } });
      if (!sec) notFound("Section");
      const maxPos = await prismadb.tasks.aggregate({
        where: { section: args.section },
        _max: { position: true },
      });
      const task = await prismadb.tasks.create({
        data: {
          v: 0,
          title: args.title,
          content: args.content,
          section: args.section,
          priority: args.priority,
          position: (maxPos._max.position ?? BigInt(0)) + BigInt(1000),
          user: userId,
          createdBy: userId,
          updatedBy: userId,
          ...(args.dueDateAt && { dueDateAt: new Date(args.dueDateAt) }),
        },
      });
      return itemResponse(task);
    },
  },
  {
    name: "projects_update_task",
    description: "Update a task by ID",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      priority: z.string().optional(),
      dueDateAt: z.string().datetime().optional(),
      taskStatus: z.enum(["ACTIVE", "PENDING", "COMPLETE"]).optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Task");
      const { id, dueDateAt, ...rest } = args;
      const task = await prismadb.tasks.update({
        where: { id },
        data: {
          ...rest,
          ...(dueDateAt !== undefined && { dueDateAt: new Date(dueDateAt) }),
          updatedBy: userId,
        },
      });
      return itemResponse(task);
    },
  },
  {
    name: "projects_move_task",
    description: "Move a task to a different section and/or position",
    schema: z.object({
      id: z.string().uuid(),
      section: z.string().uuid(),
      position: z.number().int().optional(),
    }),
    async handler(args: { id: string; section: string; position?: number }, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Task");
      const sec = await prismadb.sections.findUnique({ where: { id: args.section } });
      if (!sec) notFound("Section");
      const task = await prismadb.tasks.update({
        where: { id: args.id },
        data: {
          section: args.section,
          ...(args.position !== undefined && { position: BigInt(args.position) }),
          updatedBy: userId,
        },
      });
      return itemResponse(task);
    },
  },
  {
    name: "projects_delete_task",
    description: "Soft-delete a task (sets status to COMPLETE)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Task");
      const task = await prismadb.tasks.update({
        where: { id: args.id },
        data: { taskStatus: "COMPLETE", updatedBy: userId },
      });
      return itemResponse({ id: task.id, status: "COMPLETE" });
    },
  },

  // ── Comments ──────────────────────────────────────────
  {
    name: "projects_add_comment",
    description: "Add a comment to a task",
    schema: z.object({
      task: z.string().uuid(),
      comment: z.string().min(1),
    }),
    async handler(args: { task: string; comment: string }, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.task } });
      if (!existing) notFound("Task");
      const tc = await prismadb.tasksComments.create({
        data: { v: 0, task: args.task, comment: args.comment, user: userId },
      });
      return itemResponse(tc);
    },
  },
  {
    name: "projects_list_comments",
    description: "List comments on a task",
    schema: z.object({
      task: z.string().uuid(),
      ...paginationSchema,
    }),
    async handler(args: { task: string; limit: number; offset: number }, _userId: string) {
      const where = { task: args.task };
      const [data, total] = await Promise.all([
        prismadb.tasksComments.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { assigned_user: { select: { id: true, name: true } } },
        }),
        prismadb.tasksComments.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },

  // ── Document Link ─────────────────────────────────────
  {
    name: "projects_assign_document",
    description: "Link a document to a task",
    schema: z.object({
      task_id: z.string().uuid(),
      document_id: z.string().uuid(),
    }),
    async handler(args: { task_id: string; document_id: string }, _userId: string) {
      await prismadb.documentsToTasks.create({
        data: { task_id: args.task_id, document_id: args.document_id },
      });
      return itemResponse({ task_id: args.task_id, document_id: args.document_id });
    },
  },

  // ── Watchers ──────────────────────────────────────────
  {
    name: "projects_watch_board",
    description: "Watch or unwatch a project board",
    schema: z.object({
      board_id: z.string().uuid(),
      watch: z.boolean().default(true),
    }),
    async handler(args: { board_id: string; watch: boolean }, userId: string) {
      if (args.watch) {
        await prismadb.boardWatchers.create({
          data: { board_id: args.board_id, user_id: userId },
        }).catch(() => {}); // Already watching — ignore duplicate
      } else {
        await prismadb.boardWatchers.delete({
          where: { board_id_user_id: { board_id: args.board_id, user_id: userId } },
        }).catch(() => {}); // Not watching — ignore
      }
      return itemResponse({ board_id: args.board_id, watching: args.watch });
    },
  },
];
