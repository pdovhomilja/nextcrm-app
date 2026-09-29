// Fork-owned MCP tools for the target triage gate. Kept in a separate file (like
// crm-enrichment.ts) and registered in index.ts so lib/mcp/tools/crm-targets.ts
// (upstream-owned) stays as close to upstream as possible. See CLAUDE.md
// "Additive-first change standard" and docs/reference/UPSTREAM_IMPACT_LOG.md.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { buildTriageData } from "@/lib/crm/triage";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
} from "../helpers";

export const crmTargetTriageTools = [
  {
    name: "crm_list_targets_by_triage",
    description:
      "List the authenticated user's targets filtered by triage_status (NEW, APPROVED, PASSED).",
    schema: z.object({
      triage_status: z.enum(["NEW", "APPROVED", "PASSED"]),
      ...paginationSchema,
    }),
    async handler(
      args: { triage_status: "NEW" | "APPROVED" | "PASSED"; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        created_by: userId,
        deletedAt: null,
        triage_status: args.triage_status,
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_set_target_triage",
    description:
      "Triage a target: APPROVE it for outreach, or PASS it with a reason (SCOPE_TOO_LARGE, NOT_A_FIT, BAD_TIMING, ALREADY_MODERN, OTHER) and an optional note and revisit_at date. APPROVE clears any prior pass fields.",
    schema: z.object({
      id: z.string().uuid(),
      status: z.enum(["APPROVED", "PASSED"]),
      pass_reason: z
        .enum(["SCOPE_TOO_LARGE", "NOT_A_FIT", "BAD_TIMING", "ALREADY_MODERN", "OTHER"])
        .optional(),
      pass_note: z.string().optional(),
      revisit_at: z.string().datetime().optional(),
    }),
    async handler(
      args: {
        id: string;
        status: "APPROVED" | "PASSED";
        pass_reason?: "SCOPE_TOO_LARGE" | "NOT_A_FIT" | "BAD_TIMING" | "ALREADY_MODERN" | "OTHER";
        pass_note?: string;
        revisit_at?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId, deletedAt: null },
      });
      if (!existing) notFound("Target");
      // Shared with the web action; throws on invalid status / missing reason.
      const triageData = buildTriageData({
        status: args.status,
        pass_reason: args.pass_reason,
        pass_note: args.pass_note,
        revisit_at: args.revisit_at,
        userId,
      });
      const target = await prismadb.crm_Targets.update({
        where: { id: args.id },
        data: { ...triageData, updatedBy: userId },
      });
      await writeAuditLog({
        entityType: "target",
        entityId: args.id,
        action: "updated",
        changes: diffObjects(
          existing as unknown as Record<string, unknown>,
          target as unknown as Record<string, unknown>
        ),
        userId,
      });
      return itemResponse(target);
    },
  },
];
