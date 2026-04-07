import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { paginationSchema, paginationArgs, listResponse, itemResponse } from "../helpers";
import type { ReportFilters } from "@/actions/reports/types";

export const reportTools = [
  {
    name: "reports_list",
    description: "List available report configurations",
    schema: z.object({
      category: z
        .enum(["sales", "leads", "accounts", "activity", "campaigns", "users"])
        .optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { category?: string; limit: number; offset: number },
      _userId: string
    ) {
      const where = {
        ...(args.category && { category: args.category }),
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Report_Config.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Report_Config.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "reports_run",
    description:
      "Run a report by category and get the data. Returns raw report data (use format param for CSV/PDF via the /api/reports/export endpoint).",
    schema: z.object({
      category: z.enum([
        "sales",
        "leads",
        "accounts",
        "activity",
        "campaigns",
        "users",
      ]),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    }),
    async handler(
      args: { category: string; dateFrom?: string; dateTo?: string },
      _userId: string
    ) {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filters: ReportFilters = {
        dateFrom: args.dateFrom ? new Date(args.dateFrom) : thirtyDaysAgo,
        dateTo: args.dateTo ? new Date(args.dateTo) : now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      switch (args.category) {
        case "sales": {
          const mod = await import("@/actions/reports/sales");
          data = await mod.getOppsByMonth(filters);
          break;
        }
        case "leads": {
          const mod = await import("@/actions/reports/leads");
          data = await mod.getNewLeads(filters);
          break;
        }
        case "accounts": {
          const mod = await import("@/actions/reports/accounts");
          data = await mod.getNewAccounts(filters);
          break;
        }
        case "activity": {
          const mod = await import("@/actions/reports/activity");
          data = await mod.getTasksByAssignee(filters);
          break;
        }
        case "campaigns": {
          const mod = await import("@/actions/reports/campaigns");
          data = await mod.getCampaignPerformance(filters);
          break;
        }
        case "users": {
          const mod = await import("@/actions/reports/users");
          data = await mod.getUserGrowth(filters);
          break;
        }
      }

      return itemResponse({ category: args.category, data });
    },
  },
];
