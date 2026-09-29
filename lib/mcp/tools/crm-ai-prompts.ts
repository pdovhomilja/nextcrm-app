// Fork-owned MCP tools for the AI prompt library. Registered in index.ts so
// upstream-owned tool files stay untouched. See CLAUDE.md Additive-first standard.
// MCP only creates/deletes PERSONAL prompts (scope USER, user_id = caller); org-wide
// prompts are managed by admins in the web UI.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
} from "../helpers";

export const crmAiPromptTools = [
  {
    name: "crm_list_prompts",
    description:
      "List AI prompt-library entries (org-wide + the caller's personal) for a kind (EMAIL or HOMEPAGE).",
    schema: z.object({
      kind: z.enum(["EMAIL", "HOMEPAGE"]),
      ...paginationSchema,
    }),
    async handler(
      args: { kind: "EMAIL" | "HOMEPAGE"; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        deletedAt: null,
        kind: args.kind,
        OR: [{ scope: "ORG" as const }, { scope: "USER" as const, user_id: userId }],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Ai_Prompt.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { name: "asc" },
        }),
        prismadb.crm_Ai_Prompt.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_prompt",
    description:
      "Create a PERSONAL AI prompt (owned by the caller). Org-wide prompts are managed in the web UI by admins.",
    schema: z.object({
      name: z.string().min(1),
      body: z.string().min(1),
      kind: z.enum(["EMAIL", "HOMEPAGE"]),
    }),
    async handler(
      args: { name: string; body: string; kind: "EMAIL" | "HOMEPAGE" },
      userId: string
    ) {
      const created = await prismadb.crm_Ai_Prompt.create({
        data: {
          name: args.name,
          body: args.body,
          kind: args.kind,
          scope: "USER",
          user_id: userId,
          created_by: userId,
        },
      });
      return itemResponse(created);
    },
  },
  {
    name: "crm_delete_prompt",
    description: "Soft-delete one of the caller's PERSONAL AI prompts by id.",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Ai_Prompt.findFirst({
        where: { id: args.id, scope: "USER", user_id: userId, deletedAt: null },
      });
      if (!existing) notFound("Prompt");
      const updated = await prismadb.crm_Ai_Prompt.update({
        where: { id: args.id },
        data: { deletedAt: new Date(), deletedBy: userId },
      });
      return itemResponse(updated);
    },
  },
];
